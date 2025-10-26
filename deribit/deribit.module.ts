import { Module } from '@nestjs/common';
import { DeribitController } from './deribit.controller';
import { DeribitClientService } from './deribit.client.service';

@Module({
	controllers: [DeribitController],
	providers: [DeribitClientService],
	exports: [DeribitClientService],
})
export class DeribitModule {}
