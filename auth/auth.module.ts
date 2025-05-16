import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WalletService } from 'wallet/wallet.service';
import { JwtModule } from '@nestjs/jwt';
import { WalletModule } from 'wallet/wallet.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

@Module({
	imports: [
		WalletModule,
		JwtModule.registerAsync({
			global: true,
			imports: [WalletModule],
			inject: [WalletService],
			useFactory: async (wallet: WalletService) => {
				return {
					secret: wallet.getJwtSecret(),
					signOptions: { expiresIn: '4h' },
				};
			},
		}),
	],
	providers: [
		AuthService,
		{
			provide: APP_GUARD,
			useClass: AuthGuard,
		},
	],
	controllers: [AuthController],
})
export class AuthModule {}
