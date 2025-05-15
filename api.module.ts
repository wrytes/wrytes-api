// CORE IMPORTS
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// SERVICE IMPORTS
import { ApiService } from 'api.service';
import { Storj } from 'storj/storj.s3.service';
import { TelegramService } from 'telegram/telegram.service';
import { WalletService } from 'wallet/wallet.service';
import { DockerModule } from './docker/docker.module';
import { AuthModule } from 'auth/auth.module';

// CONTROLLER IMPORTS

// APP MODULE
@Module({
	imports: [ConfigModule.forRoot(), ScheduleModule.forRoot(), AuthModule, DockerModule],
	// controllers: [

	// ],
	providers: [Storj, WalletService, TelegramService, ApiService],
})
export class AppModule {}
