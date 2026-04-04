import { Module } from '@nestjs/common';
import { SafeService } from './safe.service';
import { SafeController } from './safe.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
	imports: [WalletModule],
	providers: [SafeService],
	exports: [SafeService],
	controllers: [SafeController],
})
export class SafeModule {}
