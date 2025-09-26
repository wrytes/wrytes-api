import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RoleService } from './roles.service';
import { CreateRoleDto } from './dtos/CreateRole.dto';
import { AssignPermissionDto } from './dtos/AssignPermission.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
	constructor(private readonly roleService: RoleService) {}

	@Post()
	@RequirePermission('roles', 'create')
	@ApiOperation({
		summary: 'Create new role',
		description: 'Creates a new role in the system. Requires roles:create permission',
	})
	@ApiResponse({ status: 201, description: 'Role created successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 400, description: 'Invalid role data' })
	async createRole(@Body() createRoleDto: CreateRoleDto) {
		return this.roleService.createRole(createRoleDto);
	}

	@Get()
	@RequirePermission('roles', 'read')
	@ApiOperation({
		summary: 'Get all roles',
		description: 'Retrieves a list of all roles available in the system',
	})
	@ApiResponse({ status: 200, description: 'List of roles retrieved successfully' })
	async getAllRoles() {
		return this.roleService.getAllRoles();
	}

	@Get(':id')
	@RequirePermission('roles', 'read')
	@ApiOperation({
		summary: 'Get role by ID',
		description: 'Retrieves detailed information about a specific role by its ID. Requires roles:read permission',
	})
	@ApiParam({ name: 'id', description: 'Role ID' })
	@ApiResponse({ status: 200, description: 'Role retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'Role not found' })
	async getRole(@Param('id') id: string) {
		return this.roleService.getRoleById(id);
	}

	@Put(':id')
	@RequirePermission('roles', 'update')
	@ApiOperation({
		summary: 'Update role',
		description: 'Updates the properties of an existing role. Requires roles:update permission',
	})
	@ApiParam({ name: 'id', description: 'Role ID' })
	@ApiResponse({ status: 200, description: 'Role updated successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'Role not found' })
	@ApiResponse({ status: 400, description: 'Invalid role data' })
	async updateRole(@Param('id') id: string, @Body() updateRoleDto: Partial<CreateRoleDto>) {
		return this.roleService.updateRole(id, updateRoleDto);
	}

	@Delete(':id')
	@RequirePermission('roles', 'delete')
	@ApiOperation({
		summary: 'Delete role',
		description: 'Permanently deletes a role from the system. Requires roles:delete permission',
	})
	@ApiParam({ name: 'id', description: 'Role ID' })
	@ApiResponse({ status: 200, description: 'Role deleted successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'Role not found' })
	async deleteRole(@Param('id') id: string) {
		await this.roleService.deleteRole(id);
		return { success: true };
	}

	@Post(':id/permissions')
	@RequirePermission('roles', 'assign')
	@ApiOperation({
		summary: 'Assign permission to role',
		description:
			'Assigns a specific permission to a role, granting that permission to all users with this role. Requires roles:update permission',
	})
	@ApiParam({ name: 'id', description: 'Role ID' })
	@ApiResponse({ status: 200, description: 'Permission assigned successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'Role or permission not found' })
	async assignPermissionToRole(@Param('id') roleId: string, @Body() assignPermissionDto: AssignPermissionDto) {
		return this.roleService.assignPermissionToRole(roleId, assignPermissionDto.permissionId);
	}

	@Delete(':id/permissions/:permissionId')
	@RequirePermission('roles', 'assign')
	@ApiOperation({
		summary: 'Remove permission from role',
		description:
			'Removes a specific permission from a role, revoking that permission from all users with this role. Requires roles:update permission',
	})
	@ApiParam({ name: 'id', description: 'Role ID' })
	@ApiParam({ name: 'permissionId', description: 'Permission ID' })
	@ApiResponse({ status: 200, description: 'Permission removed successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'Role or permission not found' })
	async removePermissionFromRole(@Param('id') roleId: string, @Param('permissionId') permissionId: string) {
		await this.roleService.removePermissionFromRole(roleId, permissionId);
		return { success: true };
	}
}
