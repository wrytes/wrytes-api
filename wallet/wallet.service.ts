import { Injectable, Logger } from '@nestjs/common';
import { Hash, recoverMessageAddress } from 'viem';
import { privateKeyToAccount, PrivateKeyAccount, Address } from 'viem/accounts';
import { VerifySignatureOptions } from './wallet.types';

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
