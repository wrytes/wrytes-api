import { Module } from '@nestjs/common';
import { OffRampRoutesService } from './offramp-routes.service';
import { OffRampRoutesController } from './offramp-routes.controller';
import { SafeModule } from '../../integrations/safe/safe.module';
import { KrakenModule } from '../../integrations/kraken/kraken.module';

@Module({
  imports: [SafeModule, KrakenModule],
  providers: [OffRampRoutesService],
  controllers: [OffRampRoutesController],
  exports: [OffRampRoutesService],
})
export class OffRampRoutesModule {}
