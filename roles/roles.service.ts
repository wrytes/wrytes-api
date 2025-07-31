import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

export interface CreateRoleDto {
	name: string;
	description?: string;
}

export interface CreatePermissionDto {
	resource: string;
	action: string;
	description?: string;
}

@Injectable()
export class RoleService {
	constructor(private readonly databaseService: DatabaseService) {}

	private get prisma(): PrismaClient {
		const client = this.databaseService.getPrismaClient();
		if (!client) {
			throw new Error('Database client not available');
		}
		return client;
	}

	async createRole(data: CreateRoleDto) {
		// Check if role already exists
		const existingRole = await this.prisma.role.findUnique({
			where: { name: data.name },
		});

		if (existingRole) {
			throw new ConflictException(`Role with name ${data.name} already exists`);
		}

		return this.prisma.role.create({
			data: {
				name: data.name,
				description: data.description,
				isSystem: false,
			},
		});
	}

	async getAllRoles() {
		return this.prisma.role.findMany({
			include: {
				rolePermissions: {
					include: {
						permission: true,
					},
				},
				_count: {
					select: {
						userRoles: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});
	}

	async getRoleById(roleId: string) {
		const role = await this.prisma.role.findUnique({
			where: { id: roleId },
			include: {
				rolePermissions: {
					include: {
						permission: true,
					},
				},
				userRoles: {
					include: {
						user: {
							select: {
								id: true,
								walletAddress: true,
								username: true,
								email: true,
							},
						},
					},
				},
			},
		});

		if (!role) {
			throw new NotFoundException(`Role with ID ${roleId} not found`);
		}

		return role;
	}

	async updateRole(roleId: string, data: Partial<CreateRoleDto>) {
		const role = await this.prisma.role.findUnique({
			where: { id: roleId },
		});

		if (!role) {
			throw new NotFoundException(`Role with ID ${roleId} not found`);
		}

		if (role.isSystem) {
			throw new ConflictException('Cannot modify system roles');
		}

		// Check for name conflicts if name is being updated
		if (data.name && data.name !== role.name) {
			const existingRole = await this.prisma.role.findUnique({
				where: { name: data.name },
			});
			if (existingRole) {
				throw new ConflictException(`Role with name ${data.name} already exists`);
			}
		}

		return this.prisma.role.update({
			where: { id: roleId },
			data,
		});
	}

	async deleteRole(roleId: string) {
		const role = await this.prisma.role.findUnique({
			where: { id: roleId },
			include: {
				_count: {
					select: {
						userRoles: true,
					},
				},
			},
		});

		if (!role) {
			throw new NotFoundException(`Role with ID ${roleId} not found`);
		}

		if (role.isSystem) {
			throw new ConflictException('Cannot delete system roles');
		}

		if (role._count.userRoles > 0) {
			throw new ConflictException('Cannot delete role that is assigned to users');
		}

		await this.prisma.role.delete({
			where: { id: roleId },
		});
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

	async assignPermissionToRole(roleId: string, permissionId: string) {
		const role = await this.prisma.role.findUnique({
			where: { id: roleId },
		});

		if (!role) {
			throw new NotFoundException(`Role with ID ${roleId} not found`);
		}

		const permission = await this.prisma.permission.findUnique({
			where: { id: permissionId },
		});

		if (!permission) {
			throw new NotFoundException(`Permission with ID ${permissionId} not found`);
		}

		// Check if role already has this permission
		const existingRolePermission = await this.prisma.rolePermission.findUnique({
			where: {
				roleId_permissionId: {
					roleId,
					permissionId,
				},
			},
		});

		if (existingRolePermission) {
			throw new ConflictException(`Role already has permission ${permission.resource}:${permission.action}`);
		}

		return this.prisma.rolePermission.create({
			data: {
				roleId,
				permissionId,
			},
			include: {
				role: true,
				permission: true,
			},
		});
	}

	async removePermissionFromRole(roleId: string, permissionId: string) {
		const rolePermission = await this.prisma.rolePermission.findUnique({
			where: {
				roleId_permissionId: {
					roleId,
					permissionId,
				},
			},
		});

		if (!rolePermission) {
			throw new NotFoundException('Role does not have the specified permission');
		}

		await this.prisma.rolePermission.delete({
			where: {
				roleId_permissionId: {
					roleId,
					permissionId,
				},
			},
		});
	}

	async hasRole(userRoles: any[], roleName: string): Promise<boolean> {
		return userRoles.some((userRole) => userRole.role.name === roleName);
	}

	async hasPermission(userRoles: any[], resource: string, action: string): Promise<boolean> {
		for (const userRole of userRoles) {
			const hasPermission = userRole.role.rolePermissions?.some(
				(rolePermission: any) => rolePermission.permission.resource === resource && rolePermission.permission.action === action
			);
			if (hasPermission) return true;
		}
		return false;
	}

	async getRoleByName(roleName: string) {
		return this.prisma.role.findUnique({
			where: { name: roleName },
			include: {
				rolePermissions: {
					include: {
						permission: true,
					},
				},
			},
		});
	}
}
