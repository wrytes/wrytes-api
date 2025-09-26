import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

export interface CreatePermissionDto {
	resource: string;
	action: string;
	description?: string;
}

@Injectable()
export class PermissionsService {
	constructor(private readonly databaseService: DatabaseService) {}

	private get prisma(): PrismaClient {
		const client = this.databaseService.getPrismaClient();
		if (!client) {
			throw new Error('Database client not available');
		}
		return client;
	}

	async createPermission(data: CreatePermissionDto) {
		// Check if permission already exists
		const existingPermission = await this.prisma.permission.findUnique({
			where: {
				resource_action: {
					resource: data.resource,
					action: data.action,
				},
			},
		});

		if (existingPermission) {
			throw new ConflictException(`Permission ${data.resource}:${data.action} already exists`);
		}

		return this.prisma.permission.create({
			data,
		});
	}

	async getAllPermissions() {
		return this.prisma.permission.findMany({
			include: {
				_count: {
					select: {
						rolePermissions: true,
					},
				},
			},
			orderBy: [{ resource: 'asc' }, { action: 'asc' }],
		});
	}

	async getPermissionById(permissionId: string) {
		const permission = await this.prisma.permission.findUnique({
			where: { id: permissionId },
			include: {
				rolePermissions: {
					include: {
						role: true,
					},
				},
				_count: {
					select: {
						rolePermissions: true,
					},
				},
			},
		});

		if (!permission) {
			throw new NotFoundException(`Permission with ID ${permissionId} not found`);
		}

		return permission;
	}

	async updatePermission(permissionId: string, data: Partial<CreatePermissionDto>) {
		const permission = await this.prisma.permission.findUnique({
			where: { id: permissionId },
		});

		if (!permission) {
			throw new NotFoundException(`Permission with ID ${permissionId} not found`);
		}

		// Check for resource:action conflicts if they are being updated
		if ((data.resource || data.action) && (data.resource !== permission.resource || data.action !== permission.action)) {
			const resource = data.resource || permission.resource;
			const action = data.action || permission.action;

			const existingPermission = await this.prisma.permission.findUnique({
				where: {
					resource_action: {
						resource,
						action,
					},
				},
			});

			if (existingPermission && existingPermission.id !== permissionId) {
				throw new ConflictException(`Permission ${resource}:${action} already exists`);
			}
		}

		return this.prisma.permission.update({
			where: { id: permissionId },
			data,
		});
	}

	async deletePermission(permissionId: string) {
		const permission = await this.prisma.permission.findUnique({
			where: { id: permissionId },
			include: {
				_count: {
					select: {
						rolePermissions: true,
					},
				},
			},
		});

		if (!permission) {
			throw new NotFoundException(`Permission with ID ${permissionId} not found`);
		}

		if (permission._count.rolePermissions > 0) {
			throw new ConflictException('Cannot delete permission that is assigned to roles');
		}

		await this.prisma.permission.delete({
			where: { id: permissionId },
		});
	}
}
