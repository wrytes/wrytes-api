import { Injectable, Logger } from '@nestjs/common';
import { recoverMessageAddress } from 'viem';
import { mnemonicToAccount, HDAccount, Address } from 'viem/accounts';
import { VerifySignatureOptions } from './wallet.types';

@Injectable()
export class WalletService {
	private readonly logger = new Logger(this.constructor.name);
	private readonly account: HDAccount;
	private jwtSecret: string;

	public readonly address: Address;

	constructor() {
		if (!process.env.BACKEND_WALLET_SEED) throw new Error('BACKEND_WALLET_SEED not available');
		this.account = mnemonicToAccount(process.env.BACKEND_WALLET_SEED, { path: `m/44'/60'/0'/0/0/0` });
		this.address = this.account.address;
		this.account.signMessage({ message: `JWT Token ${Date.now()}` }).then((s) => (this.jwtSecret = s));

		this.logger.warn(`Wallet Address: ${this.address}`);
	}

	getJwtSecret(): string {
		return process.env.JWT_SECRET ?? this.jwtSecret;
	}

	async verifySignature({ message, signature, expectedAddress }: VerifySignatureOptions): Promise<boolean> {
		const recoveredAddress = await recoverMessageAddress({
			message,
			signature,
		});
		return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
	}
}
