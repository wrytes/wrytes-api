import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWalletClient, http, WalletClient } from 'viem';
import { privateKeyToAccount, PrivateKeyAccount, Address } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { ChainId, CHAIN_NAMES, ALCHEMY_CHAIN_SLUGS } from './wallet.types';

const CHAIN_DEFINITIONS: Record<ChainId, any> = {
	1: mainnet,
	// extend: 100: gnosis, 8453: base, 42161: arbitrum
};

@Injectable()
export class WalletService {
	private readonly logger = new Logger(WalletService.name);
	public readonly account: PrivateKeyAccount | null = null;
	public readonly address: Address | null = null;
	public readonly client: Record<ChainId, WalletClient> | null = null;

	constructor(private readonly configService: ConfigService) {
		const privateKey = process.env.WALLET_PRIVATE_KEY;
		const isValid =
			typeof privateKey === 'string' &&
			/^0x[0-9a-fA-F]{64}$/.test(privateKey);

		if (!isValid) {
			this.logger.warn(
				'WALLET_PRIVATE_KEY not set or invalid — wallet features disabled',
			);
			return;
		}

		const apiKey = this.configService.get<string>('alchemy.apiKey', '');
		this.account = privateKeyToAccount(privateKey as `0x${string}`);
		this.address = this.account.address;
		this.client = this.buildWalletClients(apiKey);
		this.logger.log(`Wallet initialized: ${this.address}`);
	}

	get isConfigured(): boolean {
		return this.account !== null;
	}

	requireAccount(): PrivateKeyAccount {
		if (!this.account)
			throw new Error('WALLET_PRIVATE_KEY is not configured');
		return this.account;
	}

	requireClient(chainId: ChainId): WalletClient {
		if (!this.client)
			throw new Error('WALLET_PRIVATE_KEY is not configured');
		return this.client[chainId];
	}

	private buildWalletClients(apiKey: string): Record<ChainId, WalletClient> {
		const clients: Partial<Record<ChainId, WalletClient>> = {};

		for (const [id, chain] of Object.entries(CHAIN_DEFINITIONS)) {
			const chainId = Number(id) as ChainId;
			const slug = ALCHEMY_CHAIN_SLUGS[chainId];
			clients[chainId] = createWalletClient({
				account: this.account!,
				chain,
				transport: http(`https://${slug}.g.alchemy.com/v2/${apiKey}`),
			});
		}

		return clients as Record<ChainId, WalletClient>;
	}

	getChainName(chainId: ChainId): string {
		return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
	}
}
