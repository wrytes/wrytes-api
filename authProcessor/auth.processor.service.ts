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
				// @ts-expect-error type
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
			this.logger.error('Failed to get network info');
			return {
				name: mainnet.name,
				chainId: mainnet.id,
				contractAddress: AuthorizationDomain.verifyingContract,
			};
		}
	}

	// ==========================================
	// Individual Check Functions
	// ==========================================
	// These functions perform verification checks and return detailed results
	// instead of throwing exceptions, enabling comprehensive status reporting

	async checkSignature(auth: AuthorizationInput): Promise<VerificationResult['signature']> {
		try {
			const authData = this.formatPayload(auth);
			const signer = await this.contract.read.verifySignature([authData]);
			return {
				isValid: true,
				signer: signer.toLowerCase(),
			};
		} catch (error) {
			this.logger.debug('Signature verification failed', error);
			return {
				isValid: false,
				signer: null,
				error: 'Invalid signature - signature verification failed on smart contract',
			};
		}
	}

	async checkAuthorization(auth: AuthorizationInput, signer: string): Promise<VerificationResult['authorization']> {
		const currentTime = Math.floor(Date.now() / 1000);
		const validAfter = parseInt(auth.validAfter);
		const validBefore = parseInt(auth.validBefore);

		const notPending = validAfter < currentTime;
		const notExpired = validBefore > currentTime;

		const result = {
			isValid: false,
			notPending,
			notExpired,
			nonceValid: false,
			currentTime,
			validAfter,
			validBefore,
		};

		try {
			result.nonceValid = !(await this.contract.read.nonces([signer as `0x${string}`, auth.nonce]));

			// Basic time validation
			if (validAfter >= validBefore) {
				return {
					...result,
					error: 'Invalid time range - validAfter must be less than validBefore',
				};
			}

			// Check if authorization is expired
			if (currentTime >= validBefore) {
				return {
					...result,
					error: 'Authorization expired - current time is past validBefore',
				};
			}

			if (!result.nonceValid) {
				return {
					...result,
					error: `Authorization nonce already used`,
				};
			}

			return {
				...result,
				isValid: notPending && notExpired && result.nonceValid,
				...(!notPending && {
					error: `Warning: Authorization not yet valid`,
				}),
			};
		} catch (error) {
			this.logger.debug('Authorization verification failed, nonce', error);
			return {
				...result,
				isValid: notPending && notExpired && result.nonceValid,
				error: `Authorization verification failed, nonce`,
			};
		}
	}

	async checkAllowance(auth: AuthorizationInput, signer: string): Promise<VerificationResult['allowance']> {
		try {
			const authData = this.formatPayload(auth);
			const requested = await this.contract.read.verifyAllowance([authData, signer as `0x${string}`]);

			return {
				isValid: true,
				requested: auth.amount,
				reduce: String(requested),
			};
		} catch (error) {
			this.logger.debug('Allowance verification failed', error);
			return {
				isValid: false,
				requested: auth.amount,
				reduce: auth.amount,
			};
		}
	}

	async checkCompleteAuthorization(auth: AuthorizationInput): Promise<VerificationResult> {
		const signature = await this.checkSignature(auth);
		const authorization = await this.checkAuthorization(auth, signature.signer);
		const allowance = await this.checkAllowance(auth, signature.signer);

		return {
			executable: signature.isValid && authorization.isValid && allowance.isValid,
			signature,
			authorization,
			allowance,
		};
	}

	async verifySignature(auth: AuthorizationInput): Promise<VerificationResult['signature']> {
		const result = await this.checkSignature(auth);
		if (!result.isValid) {
			throw new BadRequestException(result.error);
		}
		return result;
	}

	async verifyAuthorization(auth: AuthorizationInput, signer: string): Promise<VerificationResult['authorization']> {
		const result = await this.checkAuthorization(auth, signer);
		if (!result.isValid) {
			throw new BadRequestException(result.error);
		}
		return result;
	}

	async verifyAllowance(auth: AuthorizationInput, signer: string): Promise<VerificationResult['allowance']> {
		const result = await this.checkAllowance(auth, signer);
		if (!result.isValid) {
			throw new BadRequestException(result.error);
		}
		return result;
	}

	async verifyCompleteAuthorization(auth: AuthorizationInput) {
		const { signer } = await this.verifySignature(auth);
		await this.verifyAuthorization(auth, signer);
		await this.verifyAllowance(auth, signer);
	}

	/**
	 * Creates and stores an authorization with flexible validation approach.
	 *
	 * REQUIRED VALIDATIONS (will reject):
	 * - Valid EIP-712 signature verification
	 * - Unique signer + nonce combination
	 * - Basic time integrity (validAfter < validBefore)
	 *
	 * FLEXIBLE VALIDATIONS (accepts but records status):
	 * - Future authorizations (status: TIMELOCK)
	 * - Missing allowance (status: AUTHORIZE)
	 * - Expired authorizations (status: EXPIRED)
	 *
	 * STATUS ASSIGNMENT:
	 * - VERIFIED: Basic signature validation passed
	 * - AUTHORIZE: Waiting for sufficient allowance
	 * - TIMELOCK: Valid but not yet active
	 * - READY: Fully validated and executable
	 * - EXPIRED: Past validBefore timestamp
	 */
	async createAuthorization(auth: AuthorizationInput): Promise<any> {
		await this.verifySignature(auth); // Hard requirement - will revert on invalid signature
		const verification = await this.checkCompleteAuthorization(auth); // Get detailed status

		// Check for duplicates
		const existingAuth = await this.prisma.authorization.findUnique({
			where: {
				signer_nonce: {
					signer: verification.signature.signer,
					nonce: auth.nonce,
				},
			},
		});

		if (existingAuth) {
			throw new BadRequestException('Authorization with this signer and nonce already exists');
		} else if (!verification.authorization.nonceValid) {
			throw new BadRequestException('Authorization nonce already used');
		}

		let status = 'VERIFIED';
		if (!verification.allowance.isValid) {
			status = 'AUTHORIZE'; // Not yet authorized with allowance
		} else if (!verification.authorization.notPending) {
			status = 'TIMELOCK'; // Not yet valid, will be processed when time comes
		} else if (!verification.authorization.notExpired) {
			status = 'EXPIRED'; // Already expired
		} else {
			status = 'READY'; // passed
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
				signer: verification.signature.signer,
				allowanceAmount: verification.allowance.reduce,
				status: status as any,
				verifiedAt: new Date(),
			},
		});

		this.logger.log(`Authorization created: ${authorization.id} for signer ${verification.signature.signer} with status ${status}`);
		return authorization;
	}

	async getAuthorizationStatus(auth: AuthorizationInput): Promise<any> {
		const { signer } = await this.verifySignature(auth);

		const authorization = await this.prisma.authorization.findUnique({
			where: {
				signer_nonce: {
					signer,
					nonce: auth.nonce,
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
			orderBy: {
				createdAt: 'desc',
			},
		});

		return authorizations;
	}

	async getPendingAuthorizations(limit = 50): Promise<any[]> {
		const authorizations = await this.prisma.authorization.findMany({
			where: {
				status: {
					in: ['VERIFIED', 'AUTHORIZE', 'TIMELOCK'],
				},
			},
			orderBy: {
				createdAt: 'asc',
			},
			take: limit,
		});

		return authorizations;
	}

	async getUnsettledAuthorizations(limit = 50): Promise<any[]> {
		const authorizations = await this.prisma.authorization.findMany({
			where: {
				status: {
					in: ['READY'],
				},
			},
			orderBy: {
				createdAt: 'asc',
			},
			take: limit,
		});

		return authorizations;
	}
}
