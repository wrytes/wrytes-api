import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WalletService } from 'wallet/wallet.service';
import { JwtModule } from '@nestjs/jwt';
import { WalletModule } from 'wallet/wallet.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { RoleGuard } from './guards/role.guard';
import { PermissionGuard } from './guards/permission.guard';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
	imports: [
		WalletModule,
		UsersModule,
		RolesModule,
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
		RoleGuard,
		PermissionGuard,
		{
			provide: APP_GUARD,
			useClass: AuthGuard,
		},
	],
	controllers: [AuthController],
	exports: [RoleGuard, PermissionGuard],
})
export class AuthModule {}
