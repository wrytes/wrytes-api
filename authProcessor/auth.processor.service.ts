import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { getContract } from 'viem';
import { mainnet } from 'viem/chains';
import { DatabaseService } from '../database/database.service';
import { AuthorizationDomain, AuthorizationInput, SupportedNetworkInfo, VerificationResult } from './auth.processor.types';
import { AuthorizationProcessorABI } from './abi/AuthorizationProcessorABI';
import { PrismaClient } from '@prisma/client';
import { VIEM_CONFIG } from 'api.config';

@Injectable()
export class AuthorizationProcessorService {
	private readonly logger = new Logger(this.constructor.name);
	private readonly contract;

	constructor(private readonly databaseService: DatabaseService) {
		this.contract = getContract({
			address: AuthorizationDomain.verifyingContract,
			abi: AuthorizationProcessorABI,
			client: {
				// @ts-ignore
				public: VIEM_CONFIG,
			},
		});
	}

	private get prisma(): PrismaClient {
		const client = this.databaseService.getPrismaClient();
		if (!client) {
			throw new Error('Database client not available');
		}
		return client;
	}

	formatPayload(auth: AuthorizationInput) {
		return {
			kind: auth.kind,
			from: auth.from as `0x${string}`,
			to: auth.to as `0x${string}`,
			token: auth.token as `0x${string}`,
			amount: BigInt(auth.amount),
			nonce: auth.nonce as `0x${string}`,
			validAfter: BigInt(auth.validAfter),
			validBefore: BigInt(auth.validBefore),
			signature: auth.signature as `0x${string}`,
		};
	}

	async getSupportedNetwork(): Promise<SupportedNetworkInfo> {
		try {
			const blockNumber = await VIEM_CONFIG.getBlockNumber();

			return {
				name: mainnet.name,
				chainId: mainnet.id,
				contractAddress: AuthorizationDomain.verifyingContract,
				blockNumber: Number(blockNumber),
			};
		} catch (error) {
			this.logger.error('Failed to get network info', error);
			return {
				name: mainnet.name,
				chainId: mainnet.id,
				contractAddress: AuthorizationDomain.verifyingContract,
			};
		}
	}

	async verifySignature(auth: AuthorizationInput): Promise<string> {
		try {
			const authData = this.formatPayload(auth);

			const signer = await this.contract.read.verifySignature([authData]);
			return signer.toLowerCase();
		} catch (error) {
			this.logger.error('Signature verification failed', error);
			throw new BadRequestException('Invalid signature');
		}
	}

	async verifyAuthorization(auth: AuthorizationInput, signer: string): Promise<void> {
		try {
			const authData = this.formatPayload(auth);

			await this.contract.read.verifyAuthorization([authData, signer as `0x${string}`]);
		} catch (error) {
			this.logger.error('Authorization verification failed', error);
			throw new BadRequestException('Authorization verification failed');
		}
	}

	async verifyAllowance(auth: AuthorizationInput, signer: string): Promise<string> {
		try {
			const authData = this.formatPayload(auth);

			const allowance = await this.contract.read.verifyAllowance([authData, signer as `0x${string}`]);
			return allowance.toString();
		} catch (error) {
			this.logger.error('Allowance verification failed', error);
			throw new BadRequestException('Insufficient allowance');
		}
	}

	async verifyCompleteAuthorization(auth: AuthorizationInput): Promise<VerificationResult> {
		const signer = await this.verifySignature(auth);
		await this.verifyAuthorization(auth, signer);
		const allowanceAmount = await this.verifyAllowance(auth, signer);

		return {
			signer,
			authorizationValid: true,
			allowanceAmount,
		};
	}

	async createAuthorization(auth: AuthorizationInput): Promise<any> {
		const verification = await this.verifyCompleteAuthorization(auth);

		const existingAuth = await this.prisma.authorization.findUnique({
			where: {
				signer_nonce: {
					signer: verification.signer,
					nonce: auth.nonce,
				},
			},
		});

		if (existingAuth) {
			throw new BadRequestException('Authorization with this signer and nonce already exists');
		}

		const authorization = await this.prisma.authorization.create({
			data: {
				kind: auth.kind,
				fromAddress: auth.from.toLowerCase(),
				toAddress: auth.to.toLowerCase(),
				token: auth.token.toLowerCase(),
				amount: auth.amount,
				nonce: auth.nonce,
				validAfter: auth.validAfter,
				validBefore: auth.validBefore,
				signature: auth.signature,
				signer: verification.signer,
				authorizationValid: verification.authorizationValid,
				allowanceAmount: verification.allowanceAmount,
				status: 'VERIFIED',
				verifiedAt: new Date(),
			},
		});

		this.logger.log(`Authorization created: ${authorization.id} for signer ${verification.signer}`);
		return authorization;
	}

	async getAuthorizationStatus(auth: AuthorizationInput): Promise<any> {
		const signer = await this.verifySignature(auth);

		const authorization = await this.prisma.authorization.findUnique({
			where: {
				signer_nonce: {
					signer,
					nonce: auth.nonce,
				},
			},
			include: {
				batchMembers: {
					include: {
						batch: true,
					},
				},
			},
		});

		if (!authorization) {
			throw new NotFoundException('Authorization not found');
		}

		return authorization;
	}

	async getAuthorizationsBySignerAndNonce(signer: string, nonce?: string): Promise<any[]> {
		const where: any = {
			signer: signer.toLowerCase(),
		};

		if (nonce) {
			where.nonce = nonce;
		}

		const authorizations = await this.prisma.authorization.findMany({
			where,
			include: {
				batchMembers: {
					include: {
						batch: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		return authorizations;
	}

	async getPendingAuthorizations(limit = 50): Promise<any[]> {
		const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

		const authorizations = await this.prisma.authorization.findMany({
			where: {
				status: {
					in: ['VERIFIED', 'PENDING'],
				},
				createdAt: {
					lte: cutoffTime,
				},
			},
			orderBy: {
				createdAt: 'asc',
			},
			take: limit,
		});

		return authorizations;
	}

	async getUnsettledBatches(): Promise<any[]> {
		const batches = await this.prisma.authorizationBatch.findMany({
			where: {
				status: {
					in: ['PENDING', 'READY', 'SUBMITTING', 'SUBMITTED'],
				},
			},
			include: {
				members: {
					include: {
						authorization: true,
					},
				},
			},
			orderBy: {
				createdAt: 'asc',
			},
		});

		return batches;
	}
}
