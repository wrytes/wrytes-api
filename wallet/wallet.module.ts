import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Module({
	providers: [WalletService],
	exports: [],
})
export class WalletModule {}
