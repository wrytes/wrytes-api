import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SafeModule } from '../../integrations/safe/safe.module';
import { KrakenModule } from '../../integrations/kraken/kraken.module';
import { AlchemyModule } from '../../integrations/alchemy/alchemy.module';
import { OffRampRoutesModule } from '../../modules/offramp-routes/offramp-routes.module';
import { OffRampExecutionsModule } from '../../modules/offramp-executions/offramp-executions.module';
import { OffRampProcessor } from './offramp.processor';
import { MonitorService, MonitorController } from './monitor.service';
import { OFFRAMP_QUEUE } from './offramp.queue';

@Module({
  imports: [
    BullModule.registerQueue({ name: OFFRAMP_QUEUE }),
    SafeModule,
    KrakenModule,
    AlchemyModule,
    OffRampRoutesModule,
    OffRampExecutionsModule,
  ],
  providers: [OffRampProcessor, MonitorService],
  controllers: [MonitorController],
})
export class OffRampCoreModule {}
