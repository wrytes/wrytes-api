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
	}

	private get prisma(): PrismaClient {
		const client = this.databaseService.getPrismaClient();
		if (!client) {
			throw new Error('Database client not available');
		}
		return client;
	}

	@Cron('0 */10 * * * *')
	async executeWatcherCycle(): Promise<void> {
		try {
			await this.updatePendingEntries();
			await this.verifyReadyEntries();
			await this.batchExecutor();
		} catch (error) {
			this.logger.error('Wallet auth processor cycle failed', error);
		}
	}

	@Cron('0 */1 * * * *')
	async confirmWatchCycle(): Promise<void> {
		try {
			await this.verifyExecutedEntries();
		} catch (error) {
			this.logger.error('Wallet auth processor confirm failed', error);
		}
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

	async verifyExecutedEntries(): Promise<number> {
		this.logger.log('Verifying executed authorization entries');

		const executedAuthorizations = await this.prisma.authorization.findMany({
			where: {
				status: 'READY',
				settlementHash: {
					not: null,
				},
			},
			take: 100,
			orderBy: {
				createdAt: 'asc',
			},
		});

		if (executedAuthorizations.length === 0) {
			this.logger.debug('No executed authorizations to verify');
			return 0;
		}

		const uniqueHashes = [...new Set(executedAuthorizations.map((auth) => auth.settlementHash).filter(Boolean))];
		let settledCount = 0;

		for (const txHash of uniqueHashes) {
			try {
				const receipt = await VIEM_CONFIG.waitForTransactionReceipt({
					hash: txHash as `0x${string}`,
					timeout: 1000, // 1 second timeout to avoid blocking
				});

				if (receipt.status === 'success') {
					const block = await VIEM_CONFIG.getBlock({ blockNumber: receipt.blockNumber });
					const blockTimestamp = new Date(Number(block.timestamp) * 1000);

					const authsToUpdate = executedAuthorizations.filter((auth) => auth.settlementHash === txHash);

					await this.prisma.authorization.updateMany({
						where: {
							id: {
								in: authsToUpdate.map((auth) => auth.id),
							},
						},
						data: {
							status: 'SETTLED',
							settledAt: blockTimestamp,
							updatedAt: new Date(),
						},
					});

					settledCount += authsToUpdate.length;
					this.logger.log(
						`Confirmed transaction ${txHash} - settled ${authsToUpdate.length} authorizations at block ${receipt.blockNumber}`
					);
				}
			} catch (error) {
				this.logger.debug(`Transaction ${txHash} not yet confirmed or failed to check`, error.message);
			}
		}

		this.logger.log(`Verified ${settledCount} executed authorization entries`);
		return settledCount;
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

			const submittedTime = Math.floor(Date.now() / 1000);

			await this.prisma.authorization.updateMany({
				where: {
					id: {
						in: batchToExecute.map((auth) => auth.id),
					},
				},
				data: {
					settlementHash: txHash,
					submittedAt: String(submittedTime),
					updatedAt: String(submittedTime),
				},
			});

			this.logger.log(`Submitted batch with ${batchToExecute.length} authorizations. Transaction hash: ${txHash}`);

			return txHash;
		} catch (error) {
			this.logger.error('Failed to execute batch', error);
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
