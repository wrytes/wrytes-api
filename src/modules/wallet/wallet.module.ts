import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletViemService } from './wallet.viem.service';
import { WalletBalance } from './wallet.balance';
import { WalletToken } from './wallet.token';
import { WalletTokenList } from './wallet.tokens';
import { WalletController } from './wallet.controller';

@Module({
  providers: [WalletService, WalletViemService, WalletBalance, WalletToken, WalletTokenList],
  exports: [WalletService, WalletViemService, WalletBalance, WalletToken, WalletTokenList],
  controllers: [WalletController],
})
export class WalletModule {}
