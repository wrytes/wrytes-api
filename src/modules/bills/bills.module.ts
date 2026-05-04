import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { BillsProcessor } from './bills.processor';
import { AiModule } from '../../integrations/ai/ai.module';
import { SafeModule } from '../../integrations/safe/safe.module';
import { BILLS_QUEUE } from './bills.queue';

@Module({
	imports: [
		BullModule.registerQueue({
			name: BILLS_QUEUE,
			defaultJobOptions: {
				attempts: 3,
				backoff: { type: 'exponential', delay: 10_000 },
				removeOnComplete: true,
				removeOnFail: false,
			},
		}),
		AiModule,
		SafeModule,
	],
	controllers: [BillsController],
	providers: [BillsService, BillsProcessor],
})
export class BillsModule {}
