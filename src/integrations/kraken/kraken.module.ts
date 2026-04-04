import { Module } from '@nestjs/common';
import { KrakenClientFactory } from './kraken.factory';
import { KrakenBalance } from './kraken.balance';
import { KrakenWithdraw } from './kraken.withdraw';
import { KrakenDeposit } from './kraken.deposit';
import { KrakenMarket } from './kraken.market';
import { KrakenOrders } from './kraken.orders';
import { KrakenController } from './kraken.controller';
import { WalletModule } from '../../integrations/wallet/wallet.module';
import { ExchangeCredentialsModule } from '../../modules/exchange-credentials/exchange-credentials.module';

@Module({
  imports: [WalletModule, ExchangeCredentialsModule],
  providers: [KrakenClientFactory, KrakenBalance, KrakenWithdraw, KrakenDeposit, KrakenMarket, KrakenOrders],
  exports: [KrakenClientFactory, KrakenBalance, KrakenWithdraw, KrakenDeposit, KrakenMarket, KrakenOrders],
  controllers: [KrakenController],
})
export class KrakenModule {}
