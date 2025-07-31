import { Controller, Get, Put, Body, Request, Param, Query, Post, Delete } from '@nestjs/common';
import { UserService } from './users.service';
import { UpdateProfileDto } from './dtos/UpdateProfile.dto';
import { AssignRoleDto } from './dtos/AssignRole.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('users')
export class UsersController {
	constructor(private readonly userService: UserService) {}

	@Get('profile')
	async getProfile(@Request() req) {
		if (!req.user?.address) {
			throw new Error('User not authenticated');
		}

		const user = await this.userService.getUserByWallet(req.user.address);
		if (!user) {
			throw new Error('User not found');
		}

		return user;
	}

	@Put('profile')
	async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
		if (!req.user?.userId) {
			throw new Error('User not authenticated');
		}

		return this.userService.updateProfile(req.user.userId, updateDto);
	}

	@Get()
	@RequirePermission('users', 'read')
	async getAllUsers(@Query('includeInactive') includeInactive?: string) {
		const includeInactiveBool = includeInactive === 'true';
		return this.userService.getAllUsers(includeInactiveBool);
	}

	@Get(':id')
	@RequirePermission('users', 'read')
	async getUser(@Param('id') id: string) {
		return this.userService.getUserById(id);
	}

	@Put(':id/activate')
	@RequirePermission('users', 'update')
	async activateUser(@Param('id') id: string) {
		return this.userService.activateUser(id);
	}

	@Put(':id/deactivate')
	@RequirePermission('users', 'update')
	async deactivateUser(@Param('id') id: string) {
		return this.userService.deactivateUser(id);
	}

	@Post(':id/roles')
	@RequirePermission('roles', 'assign')
	async assignRole(@Param('id') userId: string, @Body() assignRoleDto: AssignRoleDto, @Request() req) {
		return this.userService.assignRole(userId, assignRoleDto.roleId, req.user?.userId, assignRoleDto.expiresAt);
	}

	@Delete(':id/roles/:roleId')
	@RequirePermission('roles', 'assign')
	async removeRole(@Param('id') userId: string, @Param('roleId') roleId: string) {
		await this.userService.removeRole(userId, roleId);
		return { success: true };
	}

	@Get(':id/roles')
	@RequirePermission('users', 'read')
	async getUserRoles(@Param('id') userId: string) {
		return this.userService.getUserRoles(userId);
	}
}
