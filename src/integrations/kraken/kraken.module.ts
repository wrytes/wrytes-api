import { Module } from '@nestjs/common';
import { KrakenClient } from './kraken.client';
import { KrakenBalance } from './kraken.balance';
import { KrakenWithdraw } from './kraken.withdraw';
import { KrakenDeposit } from './kraken.deposit';
import { KrakenMarket } from './kraken.market';
import { KrakenOrders } from './kraken.orders';
import { KrakenController } from './kraken.controller';
import { WalletModule } from '../../integrations/wallet/wallet.module';

@Module({
  imports: [WalletModule],
  providers: [KrakenClient, KrakenBalance, KrakenWithdraw, KrakenDeposit, KrakenMarket, KrakenOrders],
  exports: [KrakenClient, KrakenBalance, KrakenWithdraw, KrakenDeposit, KrakenMarket, KrakenOrders],
  controllers: [KrakenController],
})
export class KrakenModule {}
