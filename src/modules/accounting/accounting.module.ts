import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { DatabaseModule } from '../../core/database/database.module';
import { AlchemyModule } from '../../integrations/alchemy/alchemy.module';

@Module({
  imports: [DatabaseModule, AlchemyModule],
  providers: [AccountingService],
  controllers: [AccountingController],
})
export class AccountingModule {}
