import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { PermissionGuard } from './guards/permission.guard';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
	imports: [
		UsersModule,
		RolesModule,
		JwtModule.registerAsync({
			global: true,
			useFactory: () => {
				const jwtSecret = process.env.JWT_SECRET;
				if (!jwtSecret) {
					throw new Error('JWT_SECRET environment variable is required');
				}
				return {
					secret: jwtSecret,
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
