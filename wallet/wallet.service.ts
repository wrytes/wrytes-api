import { Injectable, Logger } from '@nestjs/common';
import { recoverMessageAddress } from 'viem';
import { mnemonicToAccount, HDAccount, Address } from 'viem/accounts';
import { VerifySignatureOptions } from './wallet.types';

@Injectable()
export class WalletService {
	private readonly logger = new Logger(this.constructor.name);
	private readonly account: HDAccount;

	public readonly address: Address;

	constructor() {
		if (!process.env.BACKEND_WALLET_SEED) {
			throw new Error('BACKEND_WALLET_SEED not available');
		}

		this.account = mnemonicToAccount(process.env.BACKEND_WALLET_SEED, {
			path: `m/44'/60'/0'/0/0/0`,
		});
		this.address = this.account.address;

		this.logger.log(`Wallet initialized with address: ${this.address}`);
	}

	async verifySignature({ message, signature, expectedAddress }: VerifySignatureOptions): Promise<boolean> {
		try {
			const recoveredAddress = await recoverMessageAddress({
				message,
				signature,
			});

			const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();

			this.logger.debug('Signature verification completed', {
				expectedAddress,
				recoveredAddress,
				isValid,
			});

			return isValid;
		} catch (error) {
			this.logger.error('Signature verification failed', {
				error: error.message,
				expectedAddress,
				isValid: false,
			});
			return false;
		}
	}
}
