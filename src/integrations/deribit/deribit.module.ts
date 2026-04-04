import { Module } from '@nestjs/common';
import { DeribitClientService } from './deribit.client.service';
import { DeribitAccount } from './deribit.account';
import { DeribitMarket } from './deribit.market';
import { DeribitTrading } from './deribit.trading';
import { DeribitWallet } from './deribit.wallet';
import { DeribitController } from './deribit.controller';
import { ExchangeCredentialsModule } from '../../modules/exchange-credentials/exchange-credentials.module';

@Module({
  imports: [ExchangeCredentialsModule],
  providers: [DeribitClientService, DeribitAccount, DeribitMarket, DeribitTrading, DeribitWallet],
  exports: [DeribitClientService, DeribitAccount, DeribitMarket, DeribitTrading, DeribitWallet],
  controllers: [DeribitController],
})
export class DeribitModule {}
