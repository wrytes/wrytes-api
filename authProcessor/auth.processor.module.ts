import { Module } from '@nestjs/common';
import { AuthorizationProcessorController } from './auth.processor.controller';
import { AuthorizationProcessorService } from './auth.processor.service';
import { DatabaseModule } from '../database/database.module';

@Module({
	imports: [DatabaseModule],
	controllers: [AuthorizationProcessorController],
	providers: [AuthorizationProcessorService],
	exports: [AuthorizationProcessorService],
})
export class AuthProcessorModule {}
