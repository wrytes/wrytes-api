import { Injectable, Logger } from '@nestjs/common';
import { mnemonicToAccount, HDAccount, Address } from 'viem/accounts';

@Injectable()
export class WalletService {
	private readonly logger = new Logger(this.constructor.name);
	private readonly account: HDAccount;
	public readonly address: Address;

	constructor() {
		if (!process.env.BACKEND_WALLET_SEED) throw new Error('BACKEND_WALLET_SEED not available');
		this.account = mnemonicToAccount(process.env.BACKEND_WALLET_SEED, { path: `m/44'/60'/0'/0/0/0` });
		this.address = this.account.address;

		this.logger.warn(`Wallet Address: ${this.address}`);
	}

	// @Interval(2000)
	// async verifyMembership() {
	// 	const asdf = await VIEM_CONFIG.readContract({
	// 		address: ADDRESS[VIEM_CONFIG.chain.id].backendWallet,
	// 		abi: BackendWalletABI,
	// 		functionName: 'checkAtLeastMember',
	// 		args: ['0x...'],
	// 	});
	// 	console.log(asdf);
	// }
}
