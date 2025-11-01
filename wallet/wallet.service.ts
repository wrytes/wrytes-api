import { Injectable, Logger } from '@nestjs/common';
import { Hash } from 'viem';
import { privateKeyToAccount, PrivateKeyAccount, Address } from 'viem/accounts';

@Injectable()
export class WalletService {
	private readonly logger = new Logger(this.constructor.name);
	private readonly account: PrivateKeyAccount;

	public readonly address: Address;

	constructor() {
		if (!process.env.WALLET_PRIVATE_KEY) {
			throw new Error('WALLET_PRIVATE_KEY not available');
		}

		this.account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as Hash);
		this.address = this.account.address;

		this.logger.log(`Wallet initialized with address: ${this.address}`);
	}
}
