import { Controller, Get, Put, Body, Request, Param, Query, Post, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserService } from './users.service';
import { UpdateProfileDto } from './dtos/UpdateProfile.dto';
import { AssignRoleDto } from './dtos/AssignRole.dto';
import { RequirePermission } from 'auth/decorators/require-permission.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
	constructor(private readonly userService: UserService) {}

	@Get('profile')
	@ApiOperation({ summary: 'Get current user profile', description: 'Retrieves the profile information for the currently authenticated user' })
	@ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
	@ApiResponse({ status: 401, description: 'User not authenticated' })
	@ApiResponse({ status: 404, description: 'User not found' })
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
	@ApiOperation({ summary: 'Update user profile', description: 'Updates the profile information for the currently authenticated user' })
	@ApiResponse({ status: 200, description: 'Profile updated successfully' })
	@ApiResponse({ status: 401, description: 'User not authenticated' })
	@ApiResponse({ status: 400, description: 'Invalid profile data' })
	async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
		if (!req.user?.userId) {
			throw new Error('User not authenticated');
		}

		return this.userService.updateProfile(req.user.userId, updateDto);
	}

	@Get()
	@RequirePermission('users', 'read')
	@ApiOperation({ summary: 'Get all users', description: 'Retrieves a list of all users in the system. Requires users:read permission' })
	@ApiQuery({ name: 'includeInactive', required: false, description: 'Include inactive users in the results' })
	@ApiResponse({ status: 200, description: 'List of users retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async getAllUsers(@Query('includeInactive') includeInactive?: string) {
		const includeInactiveBool = includeInactive === 'true';
		return this.userService.getAllUsers(includeInactiveBool);
	}

	@Get(':id')
	@RequirePermission('users', 'read')
	@ApiOperation({ summary: 'Get user by ID', description: 'Retrieves detailed information about a specific user by their ID. Requires users:read permission' })
	@ApiParam({ name: 'id', description: 'User ID' })
	@ApiResponse({ status: 200, description: 'User retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'User not found' })
	async getUser(@Param('id') id: string) {
		return this.userService.getUserById(id);
	}

	@Put(':id/activate')	
	@RequirePermission('users', 'update')
	@ApiOperation({ summary: 'Activate user', description: 'Activates a user account, enabling them to access the system. Requires users:update permission' })
	@ApiParam({ name: 'id', description: 'User ID' })
	@ApiResponse({ status: 200, description: 'User activated successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'User not found' })
	async activateUser(@Param('id') id: string) {
		return this.userService.activateUser(id);
	}

	@Put(':id/deactivate')
	@RequirePermission('users', 'update')
	@ApiOperation({ summary: 'Deactivate user', description: 'Deactivates a user account, preventing them from accessing the system. Requires users:update permission' })
	@ApiParam({ name: 'id', description: 'User ID' })
	@ApiResponse({ status: 200, description: 'User deactivated successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'User not found' })
	async deactivateUser(@Param('id') id: string) {
		return this.userService.deactivateUser(id);
	}

	@Post(':id/roles')	
	@RequirePermission('roles', 'assign')
	@ApiOperation({ summary: 'Assign role to user', description: 'Assigns a specific role to a user with optional expiration date. Requires roles:assign permission' })
	@ApiParam({ name: 'id', description: 'User ID' })
	@ApiResponse({ status: 200, description: 'Role assigned successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'User or role not found' })
	async assignRole(@Param('id') userId: string, @Body() assignRoleDto: AssignRoleDto, @Request() req) {
		return this.userService.assignRole(userId, assignRoleDto.roleId, req.user?.userId, assignRoleDto.expiresAt);
	}

	@Delete(':id/roles/:roleId')
	@RequirePermission('roles', 'assign')
	@ApiOperation({ summary: 'Remove role from user', description: 'Removes a specific role from a user. Requires roles:assign permission' })
	@ApiParam({ name: 'id', description: 'User ID' })
	@ApiParam({ name: 'roleId', description: 'Role ID' })
	@ApiResponse({ status: 200, description: 'Role removed successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'User or role not found' })
	async removeRole(@Param('id') userId: string, @Param('roleId') roleId: string) {
		await this.userService.removeRole(userId, roleId);
		return { success: true };
	}

	@Get(':id/roles')
	@RequirePermission('users', 'read')
	@ApiOperation({ summary: 'Get user roles', description: 'Retrieves all roles assigned to a specific user. Requires users:read permission' })
	@ApiParam({ name: 'id', description: 'User ID' })
	@ApiResponse({ status: 200, description: 'User roles retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'User not found' })
	async getUserRoles(@Param('id') userId: string) {
		return this.userService.getUserRoles(userId);
	}
}
