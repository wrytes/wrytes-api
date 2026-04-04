import { Module } from '@nestjs/common';
import { KrakenClient } from './kraken.client';
import { KrakenBalance } from './kraken.balance';
import { KrakenMarket } from './kraken.market';
import { KrakenOrders } from './kraken.orders';
import { KrakenController } from './kraken.controller';
import { WalletModule } from '../../modules/wallet/wallet.module';

@Module({
  imports: [WalletModule],
  providers: [KrakenClient, KrakenBalance, KrakenMarket, KrakenOrders],
  exports: [KrakenClient, KrakenBalance, KrakenMarket, KrakenOrders],
  controllers: [KrakenController],
})
export class KrakenModule {}
