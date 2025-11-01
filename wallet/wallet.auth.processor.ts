import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getContract } from 'viem';
import { AuthorizationProcessorService } from '../authProcessor/auth.processor.service';
import { DatabaseService } from '../database/database.service';
import { WalletService } from './wallet.service';
import { AuthorizationDomain, AuthorizationInput } from '../authProcessor/auth.processor.types';
import { AuthorizationProcessorABI } from '../authProcessor/abi/AuthorizationProcessorABI';
import { VIEM_CONFIG } from 'api.config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class WalletAuthProcessorService {
	private readonly logger = new Logger(this.constructor.name);
	private readonly contract;
	private readonly minimumBatchSize = 5;

	constructor(
		private readonly authProcessorService: AuthorizationProcessorService,
		private readonly databaseService: DatabaseService,
		private readonly walletService: WalletService
	) {
		this.contract = getContract({
			address: AuthorizationDomain.verifyingContract,
			abi: AuthorizationProcessorABI,
			client: {
				// @ts-expect-error type
				public: VIEM_CONFIG,
				// @ts-expect-error type
				wallet: this.walletService.client,
			},
			account: this.walletService.account,
		});

		setTimeout(() => this.executeWatcherCycle(), 1000);
	}

	private get prisma(): PrismaClient {
		const client = this.databaseService.getPrismaClient();
		if (!client) {
			throw new Error('Database client not available');
		}
		return client;
	}

	@Cron('0 */5 * * * *')
	async executeWatcherCycle(): Promise<void> {
		this.logger.log('Starting wallet auth processor cycle');

		try {
			await this.updatePendingEntries();
			await this.verifyReadyEntries();
			await this.batchExecutor();
		} catch (error) {
			this.logger.error('Wallet auth processor cycle failed', error);
		}

		this.logger.log('Wallet auth processor cycle completed');
	}

	async updatePendingEntries(): Promise<number> {
		this.logger.log('Updating pending authorization entries');

		const pendingAuthorizations = await this.prisma.authorization.findMany({
			where: {
				status: {
					in: ['VERIFIED', 'AUTHORIZE', 'TIMELOCK', 'READY'],
				},
			},
			take: 100,
			orderBy: {
				createdAt: 'asc',
			},
		});

		let updatedCount = 0;

		for (const auth of pendingAuthorizations) {
			try {
				const authInput: AuthorizationInput = {
					kind: auth.kind,
					from: auth.fromAddress,
					to: auth.toAddress,
					token: auth.token,
					amount: auth.amount,
					nonce: auth.nonce,
					validAfter: auth.validAfter,
					validBefore: auth.validBefore,
					signature: auth.signature,
				};

				const verification = await this.authProcessorService.checkCompleteAuthorization(authInput);

				let newStatus = auth.status;
				const currentTime = Math.floor(Date.now() / 1000);
				const validBefore = parseInt(auth.validBefore);

				if (currentTime >= validBefore) {
					newStatus = 'EXPIRED';
				} else if (!verification.allowance.isValid) {
					newStatus = 'AUTHORIZE';
				} else if (!verification.authorization.notPending) {
					newStatus = 'TIMELOCK';
				} else if (verification.executable) {
					newStatus = 'READY';
				}

				if (newStatus !== auth.status) {
					await this.prisma.authorization.update({
						where: { id: auth.id },
						data: {
							status: newStatus as any,
							allowanceAmount: verification.allowance.reduce,
							updatedAt: new Date(),
						},
					});

					updatedCount++;
					this.logger.debug(`Updated authorization ${auth.id} from ${auth.status} to ${newStatus}`);
				}
			} catch (error) {
				this.logger.error(`Failed to update authorization ${auth.id}`, error);
			}
		}

		this.logger.log(`Updated ${updatedCount} pending authorization entries`);
		return updatedCount;
	}

	async verifyReadyEntries(): Promise<number> {
		this.logger.log('Verifying READY authorization entries');

		const readyAuthorizations = await this.prisma.authorization.findMany({
			where: {
				status: 'READY',
			},
			take: 50,
			orderBy: {
				createdAt: 'asc',
			},
		});

		let verifiedCount = 0;

		for (const auth of readyAuthorizations) {
			try {
				const authInput: AuthorizationInput = {
					kind: auth.kind,
					from: auth.fromAddress,
					to: auth.toAddress,
					token: auth.token,
					amount: auth.amount,
					nonce: auth.nonce,
					validAfter: auth.validAfter,
					validBefore: auth.validBefore,
					signature: auth.signature,
				};

				await this.authProcessorService.verifyCompleteAuthorization(authInput);
				verifiedCount++;
				this.logger.debug(`Verified authorization ${auth.id}`);
			} catch (error) {
				this.logger.warn(`Failed to verify authorization ${auth.id}, marking as FAILED`, error);

				await this.prisma.authorization.update({
					where: { id: auth.id },
					data: {
						status: 'FAILED',
						updatedAt: new Date(),
					},
				});
			}
		}

		this.logger.log(`Verified ${verifiedCount} READY authorization entries`);
		return verifiedCount;
	}

	async batchExecutor(): Promise<string | null> {
		this.logger.log('Processing batch execution');

		const readyAuthorizations = await this.prisma.authorization.findMany({
			where: {
				status: 'READY',
			},
			take: 100,
			orderBy: {
				createdAt: 'asc',
			},
		});

		if (readyAuthorizations.length < this.minimumBatchSize) {
			this.logger.log(`Batch size not reached. Found ${readyAuthorizations.length}, minimum required: ${this.minimumBatchSize}`);
			return null;
		}

		const batchToExecute = readyAuthorizations.slice(0, 50);

		try {
			const authDataArray = batchToExecute.map((auth) => {
				return this.authProcessorService.formatPayload({
					kind: auth.kind,
					from: auth.fromAddress,
					to: auth.toAddress,
					token: auth.token,
					amount: auth.amount,
					nonce: auth.nonce,
					validAfter: auth.validAfter,
					validBefore: auth.validBefore,
					signature: auth.signature,
				});
			});

			const txHash = await this.contract.write.batchExecute([authDataArray]);
			const receipt = await VIEM_CONFIG.waitForTransactionReceipt({ hash: txHash });

			const block = await VIEM_CONFIG.getBlock({ blockNumber: receipt.blockNumber });
			const timestamp = block.timestamp;

			console.log(receipt.logs);

			await this.prisma.authorization.updateMany({
				where: {
					id: {
						in: batchToExecute.map((auth) => auth.id),
					},
				},
				data: {
					status: 'SETTLED',
					settlementHash: txHash,
					settledAt: String(timestamp),
					updatedAt: String(timestamp),
				},
			});

			this.logger.log(`Executed batch with ${batchToExecute.length} authorizations. Transaction hash: ${txHash}`);

			return txHash;
		} catch (error) {
			this.logger.error('Failed to execute batch', error);

			await this.prisma.authorization.updateMany({
				where: {
					id: {
						in: batchToExecute.map((auth) => auth.id),
					},
				},
				data: {
					status: 'FAILED',
					updatedAt: new Date(),
				},
			});

			throw error;
		}
	}

	async getProcessorStatus(): Promise<{
		pendingCount: number;
		readyCount: number;
		minimumBatchSize: number;
		walletAddress: string;
	}> {
		const [pendingCount, readyCount] = await Promise.all([
			this.prisma.authorization.count({
				where: {
					status: {
						in: ['VERIFIED', 'AUTHORIZE', 'TIMELOCK'],
					},
				},
			}),
			this.prisma.authorization.count({
				where: {
					status: 'READY',
				},
			}),
		]);

		return {
			pendingCount,
			readyCount,
			minimumBatchSize: this.minimumBatchSize,
			walletAddress: this.walletService.address,
		};
	}

	async manualTriggerCycle(): Promise<void> {
		this.logger.log('Manual trigger of wallet auth processor cycle');
		await this.executeWatcherCycle();
	}
}
