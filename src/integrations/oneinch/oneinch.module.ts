import { Module } from '@nestjs/common';
import { OneInchService } from './oneinch.service';

@Module({
  providers: [OneInchService],
  exports: [OneInchService],
})
export class OneInchModule {}
