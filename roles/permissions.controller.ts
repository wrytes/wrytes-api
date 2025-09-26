import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dtos/CreatePermission.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
	constructor(private readonly permissionsService: PermissionsService) {}

	@Post()
	@RequirePermission('permissions', 'create')
	@ApiOperation({
		summary: 'Create new permission',
		description: 'Creates a new permission in the system. Requires permissions:create permission',
	})
	@ApiResponse({ status: 201, description: 'Permission created successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 400, description: 'Invalid permission data' })
	async createPermission(@Body() createPermissionDto: CreatePermissionDto) {
		return this.permissionsService.createPermission(createPermissionDto);
	}

	@Get()
	@RequirePermission('permissions', 'read')
	@ApiOperation({
		summary: 'Get all permissions',
		description: 'Retrieves a list of all permissions available in the system',
	})
	@ApiResponse({ status: 200, description: 'List of permissions retrieved successfully' })
	async getAllPermissions() {
		return this.permissionsService.getAllPermissions();
	}

	@Get(':id')
	@RequirePermission('permissions', 'read')
	@ApiOperation({
		summary: 'Get permission by ID',
		description: 'Retrieves detailed information about a specific permission by its ID. Requires permissions:read permission',
	})
	@ApiParam({ name: 'id', description: 'Permission ID' })
	@ApiResponse({ status: 200, description: 'Permission retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'Permission not found' })
	async getPermission(@Param('id') id: string) {
		return this.permissionsService.getPermissionById(id);
	}

	@Put(':id')
	@RequirePermission('permissions', 'update')
	@ApiOperation({
		summary: 'Update permission',
		description: 'Updates the properties of an existing permission. Requires permissions:update permission',
	})
	@ApiParam({ name: 'id', description: 'Permission ID' })
	@ApiResponse({ status: 200, description: 'Permission updated successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'Permission not found' })
	@ApiResponse({ status: 400, description: 'Invalid permission data' })
	async updatePermission(@Param('id') id: string, @Body() updatePermissionDto: Partial<CreatePermissionDto>) {
		return this.permissionsService.updatePermission(id, updatePermissionDto);
	}

	@Delete(':id')
	@RequirePermission('permissions', 'delete')
	@ApiOperation({
		summary: 'Delete permission',
		description: 'Permanently deletes a permission from the system. Requires permissions:delete permission',
	})
	@ApiParam({ name: 'id', description: 'Permission ID' })
	@ApiResponse({ status: 200, description: 'Permission deleted successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	@ApiResponse({ status: 404, description: 'Permission not found' })
	async deletePermission(@Param('id') id: string) {
		await this.permissionsService.deletePermission(id);
		return { success: true };
	}
}
