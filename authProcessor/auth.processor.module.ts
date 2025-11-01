import { Module } from '@nestjs/common';
import { AuthorizationProcessorController } from './auth.processor.controller';
import { AuthorizationProcessorService } from './auth.processor.service';

@Module({
	controllers: [AuthorizationProcessorController],
	providers: [AuthorizationProcessorService],
	exports: [AuthorizationProcessorService],
})
export class AuthProcessorModule {}
