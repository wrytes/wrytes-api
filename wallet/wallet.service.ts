import { Injectable, Logger } from '@nestjs/common';
import { VIEM_CONFIG } from 'api.config';
import { createWalletClient, Hash, http } from 'viem';
import { privateKeyToAccount, PrivateKeyAccount, Address } from 'viem/accounts';
import { mainnet } from 'viem/chains';

@Injectable()
export class WalletService {
	private readonly logger = new Logger(this.constructor.name);
	public readonly account: PrivateKeyAccount;
	public readonly address: Address;
	public readonly client;

	constructor() {
		if (!process.env.WALLET_PRIVATE_KEY) {
			throw new Error('WALLET_PRIVATE_KEY not available');
		}

		this.account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as Hash);
		this.address = this.account.address;

		this.client = createWalletClient({
			transport: http(VIEM_CONFIG.transport.url),
			account: this.account,
			chain: mainnet,
		});

		this.logger.log(`Wallet initialized with address: ${this.address}`);
	}
}
