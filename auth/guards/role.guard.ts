import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../../users/users.service';
import { RoleService } from '../../roles/roles.service';

@Injectable()
export class RoleGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private userService: UserService,
		private roleService: RoleService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const requiredRole = this.reflector.get<string>('requiredRole', context.getHandler());

		if (!requiredRole) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user?.address) {
			return false;
		}

		try {
			// Get user from database with roles
			const dbUser = await this.userService.getUserByWallet(user.address);

			if (!dbUser || !dbUser.isActive) {
				return false;
			}

			// Check if user has the required role
			return await this.roleService.hasRole(dbUser.userRoles, requiredRole);
		} catch (error) {
			console.error('Role guard error:', error);
			return false;
		}
	}
}
