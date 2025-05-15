import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WalletService } from 'wallet/wallet.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
	imports: [
		JwtModule.register({
			global: true,
			secret: 'jwtConstants.secret',
			signOptions: { expiresIn: '60s' },
		}),
		// JwtModule.registerAsync({
		// 	global: true,
		// 	inject: [WalletService],
		// 	useFactory: async (wallet: WalletService) => ({
		// 		secret: wallet.address,
		// 		signOptions: { expiresIn: '60s' },
		// 	}),
		// }),
	],
	providers: [AuthService, WalletService],
	controllers: [AuthController],
})
export class AuthModule {}
