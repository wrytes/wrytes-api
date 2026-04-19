import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesProcessor } from './invoices.processor';
import { AiModule } from '../../integrations/ai/ai.module';
import { SafeModule } from '../../integrations/safe/safe.module';
import { INVOICES_QUEUE } from './invoices.queue';

@Module({
  imports: [
    BullModule.registerQueue({ name: INVOICES_QUEUE }),
    AiModule,
    SafeModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesProcessor],
})
export class InvoicesModule {}
