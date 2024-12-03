import { Injectable, Logger } from '@nestjs/common';
// import { ADDRESS, BackendWalletABI } from '@wrytlabs/manager-core';
// import { mnemonicToAccount, HDAccount } from 'viem/accounts';
// import { VIEM_CONFIG } from 'api.config';
// import { Interval } from '@nestjs/schedule';

@Injectable()
export class WalletService {
	private readonly logger = new Logger(this.constructor.name);
	// private readonly seed: HDAccount;

	// constructor() {
	// 	if (!process.env.BACKEND_WALLET_SEED) throw new Error('BACKEND_WALLET_SEED not available');
	// 	this.seed = mnemonicToAccount(process.env.BACKEND_WALLET_SEED, { path: `m/44'/60'/0'/0/0/0` });

	// 	this.logger.warn(`Backend Wallet: ${ADDRESS[VIEM_CONFIG.chain.id].backendWallet}`);
	// 	setTimeout(() => this.verifyMembership, 2000);
	// }

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
