import { Module } from '@nestjs/common';
import { ExchangeCredentialsService } from './exchange-credentials.service';
import { ExchangeCredentialsController } from './exchange-credentials.controller';
import { EncryptionService } from '../../common/encryption/encryption.service';

@Module({
  providers: [ExchangeCredentialsService, EncryptionService],
  controllers: [ExchangeCredentialsController],
  exports: [ExchangeCredentialsService],
})
export class ExchangeCredentialsModule {}
