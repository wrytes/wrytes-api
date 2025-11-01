import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletAuthProcessorService } from './wallet.auth.processor';
import { DatabaseModule } from 'database/database.module';
import { AuthProcessorModule } from 'authProcessor/auth.processor.module';

@Module({
	providers: [WalletService, WalletAuthProcessorService],
	imports: [DatabaseModule, AuthProcessorModule],
})
export class WalletModule {}
