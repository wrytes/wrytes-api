import { Module } from '@nestjs/common';
import { OffRampExecutionsService } from './offramp-executions.service';
import { OffRampExecutionsController } from './offramp-executions.controller';

@Module({
  providers: [OffRampExecutionsService],
  controllers: [OffRampExecutionsController],
  exports: [OffRampExecutionsService],
})
export class OffRampExecutionsModule {}
