import { Module } from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';
import { BankAccountsController } from './bank-accounts.controller';
import { EncryptionModule } from '../../common/encryption/encryption.module';

@Module({
  imports: [EncryptionModule],
  providers: [BankAccountsService],
  controllers: [BankAccountsController],
  exports: [BankAccountsService],
})
export class BankAccountsModule {}
