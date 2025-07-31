import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { RoleService } from './roles.service';
import { CreateRoleDto } from './dtos/CreateRole.dto';
import { CreatePermissionDto } from './dtos/CreatePermission.dto';
import { AssignPermissionDto } from './dtos/AssignPermission.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('roles')
export class RolesController {
	constructor(private readonly roleService: RoleService) {}

	@Post()
	@RequirePermission('roles', 'create')
	async createRole(@Body() createRoleDto: CreateRoleDto) {
		return this.roleService.createRole(createRoleDto);
	}

	@Get()
	async getAllRoles() {
		return this.roleService.getAllRoles();
	}

	@Get(':id')
	@RequirePermission('roles', 'read')
	async getRole(@Param('id') id: string) {
		return this.roleService.getRoleById(id);
	}

	@Put(':id')
	@RequirePermission('roles', 'update')
	async updateRole(@Param('id') id: string, @Body() updateRoleDto: Partial<CreateRoleDto>) {
		return this.roleService.updateRole(id, updateRoleDto);
	}

	@Delete(':id')
	@RequirePermission('roles', 'delete')
	async deleteRole(@Param('id') id: string) {
		await this.roleService.deleteRole(id);
		return { success: true };
	}

	@Post(':id/permissions')
	@RequirePermission('roles', 'update')
	async assignPermissionToRole(@Param('id') roleId: string, @Body() assignPermissionDto: AssignPermissionDto) {
		return this.roleService.assignPermissionToRole(roleId, assignPermissionDto.permissionId);
	}

	@Delete(':id/permissions/:permissionId')
	@RequirePermission('roles', 'update')
	async removePermissionFromRole(@Param('id') roleId: string, @Param('permissionId') permissionId: string) {
		await this.roleService.removePermissionFromRole(roleId, permissionId);
		return { success: true };
	}
}

@Controller('permissions')
export class PermissionsController {
	constructor(private readonly roleService: RoleService) {}

	@Post()
	@RequirePermission('permissions', 'create')
	async createPermission(@Body() createPermissionDto: CreatePermissionDto) {
		return this.roleService.createPermission(createPermissionDto);
	}

	@Get()
	async getAllPermissions() {
		return this.roleService.getAllPermissions();
	}
}
