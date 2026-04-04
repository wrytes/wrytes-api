import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Safe from '@safe-global/protocol-kit';
import { keccak256, toHex } from 'viem';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletViemService } from '../wallet/wallet.viem.service';
import { ChainId, ALCHEMY_CHAIN_SLUGS } from '../wallet/wallet.types';

const L1_CHAIN_IDS: ChainId[] = [1];

@Injectable()
export class SafeService {
	private readonly logger = new Logger(SafeService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly wallet: WalletService,
		private readonly viemService: WalletViemService,
		private readonly configService: ConfigService,
	) {}

	private deriveSaltNonce(userId: string, chainId: ChainId, label: string): string {
		const hash = keccak256(toHex(`${userId}:${chainId}:${label}`));
		return BigInt(hash).toString();
	}

	private rpcUrl(chainId: ChainId): string {
		const apiKey = this.configService.get<string>('alchemy.apiKey', '');
		return `https://${ALCHEMY_CHAIN_SLUGS[chainId]}.g.alchemy.com/v2/${apiKey}`;
	}

	private async initSdk(saltNonce: string, chainId: ChainId): Promise<Safe> {
		const privateKey = process.env.WALLET_PRIVATE_KEY;
		if (!privateKey) throw new Error('WALLET_PRIVATE_KEY is required');

		return Safe.init({
			provider: this.rpcUrl(chainId),
			signer: privateKey,
			isL1SafeSingleton: L1_CHAIN_IDS.includes(chainId),
			predictedSafe: {
				safeAccountConfig: {
					owners: [this.wallet.address],
					threshold: 1,
				},
				safeDeploymentConfig: {
					saltNonce,
					safeVersion: '1.4.1',
				},
			},
		});
	}

	async getOrCreate(userId: string, chainId: ChainId, label = 'primary') {
		const existing = await this.prisma.safeWallet.findUnique({
			where: { userId_chainId_label: { userId, chainId, label } },
		});
		if (existing) return existing;

		const saltNonce = this.deriveSaltNonce(userId, chainId, label);
		const sdk = await this.initSdk(saltNonce, chainId);
		const address = await sdk.getAddress();

		this.logger.log(`Predicted Safe for user ${userId} on chain ${chainId} [${label}]: ${address}`);

		return this.prisma.safeWallet.create({
			data: { userId, chainId, label, address, saltNonce },
		});
	}

	async listWallets(userId: string, chainId?: ChainId) {
		return this.prisma.safeWallet.findMany({
			where: { userId, ...(chainId ? { chainId } : {}) },
			orderBy: { createdAt: 'asc' },
		});
	}

	async ensureDeployed(userId: string, chainId: ChainId, label = 'primary'): Promise<void> {
		const safeWallet = await this.getOrCreate(userId, chainId, label);
		if (safeWallet.deployed) return;

		const sdk = await this.initSdk(safeWallet.saltNonce, chainId);
		const isDeployed = await sdk.isSafeDeployed();

		if (isDeployed) {
			await this.prisma.safeWallet.update({
				where: { id: safeWallet.id },
				data: { deployed: true, deployedAt: new Date() },
			});
			return;
		}

		this.logger.log(`Deploying Safe ${safeWallet.address} for user ${userId} on chain ${chainId}`);

		const deployTx = await sdk.createSafeDeploymentTransaction();
		const hash = await this.wallet.client[chainId].sendTransaction({
			account: this.wallet.account,
			chain: null,
			to: deployTx.to as `0x${string}`,
			data: deployTx.data as `0x${string}`,
			value: BigInt(deployTx.value ?? 0),
		});

		await this.viemService.getClient(chainId).waitForTransactionReceipt({ hash });

		await this.prisma.safeWallet.update({
			where: { id: safeWallet.id },
			data: { deployed: true, deployedAt: new Date() },
		});

		this.logger.log(`Safe deployed at ${safeWallet.address} (tx: ${hash})`);
	}
}
