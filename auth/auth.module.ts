import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WalletService } from 'wallet/wallet.service';
import { JwtModule } from '@nestjs/jwt';
import { WalletModule } from 'wallet/wallet.module';

@Module({
	imports: [
		WalletModule,
		JwtModule.registerAsync({
			global: true,
			imports: [WalletModule],
			inject: [WalletService],
			useFactory: async (wallet: WalletService) => {
				return {
					secret: wallet.address,
					signOptions: { expiresIn: '60s' },
				};
			},
		}),
	],
	providers: [AuthService],
	controllers: [AuthController],
})
export class AuthModule {}
