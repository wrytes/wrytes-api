import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../../users/users.service';
import { RoleService } from '../../roles/roles.service';

interface RequiredPermission {
	resource: string;
	action: string;
}

@Injectable()
export class PermissionGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private userService: UserService,
		private roleService: RoleService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const requiredPermission = this.reflector.get<RequiredPermission>('requiredPermission', context.getHandler());

		if (!requiredPermission) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user?.address) {
			return false;
		}

		try {
			// Get user from database with roles and permissions
			const dbUser = await this.userService.getUserByWallet(user.address);

			if (!dbUser || !dbUser.isActive) {
				return false;
			}

			// Check if user has the required permission
			return this.roleService.hasPermission(dbUser.userRoles, requiredPermission.resource, requiredPermission.action);
		} catch (error) {
			console.error('Permission guard error:', error);
			return false;
		}
	}
}
