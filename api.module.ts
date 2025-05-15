// CORE IMPORTS
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// SERVICE IMPORTS
import { ApiService } from 'api.service';
import { Storj } from 'storj/storj.s3.service';
import { TelegramService } from 'telegram/telegram.service';
import { DockerModule } from './docker/docker.module';
import { AuthModule } from 'auth/auth.module';
import { WalletModule } from 'wallet/wallet.module';

// CONTROLLER IMPORTS

// APP MODULE
@Module({
	imports: [ConfigModule.forRoot(), ScheduleModule.forRoot(), AuthModule, WalletModule, DockerModule],
	// controllers: [

	// ],
	providers: [Storj, TelegramService, ApiService],
})
export class AppModule {}
