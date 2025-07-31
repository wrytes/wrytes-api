import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { isAddress } from 'viem';

export interface CreateUserDto {
	walletAddress: string;
	username?: string;
	email?: string;
	profileData?: Record<string, any>;
}

export interface UpdateProfileDto {
	username?: string;
	email?: string;
	profileData?: Record<string, any>;
}

@Injectable()
export class UserService {
	constructor(private readonly databaseService: DatabaseService) {}

	private get prisma(): PrismaClient {
		const client = this.databaseService.getPrismaClient();
		if (!client) {
			throw new Error('Database client not available');
		}
		return client;
	}

	private normalizeWalletAddress(address: string): string {
		if (!isAddress(address)) {
			throw new Error(`Invalid Ethereum address: ${address}`);
		}
		return address.toLowerCase();
	}

	async createUser(data: CreateUserDto) {
		const normalizedAddress = this.normalizeWalletAddress(data.walletAddress);

		// Check if user already exists
		const existingUser = await this.prisma.user.findUnique({
			where: { walletAddress: normalizedAddress },
		});

		if (existingUser) {
			throw new ConflictException(`User with wallet address ${data.walletAddress} already exists`);
		}

		// Check for username conflicts
		if (data.username) {
			const existingUsername = await this.prisma.user.findUnique({
				where: { username: data.username },
			});
			if (existingUsername) {
				throw new ConflictException(`Username ${data.username} is already taken`);
			}
		}

		// Check for email conflicts
		if (data.email) {
			const existingEmail = await this.prisma.user.findUnique({
				where: { email: data.email },
			});
			if (existingEmail) {
				throw new ConflictException(`Email ${data.email} is already registered`);
			}
		}

		// Create user with default user role
		const userRole = await this.prisma.role.findUnique({
			where: { name: 'user' },
		});

		if (!userRole) {
			throw new Error('Default user role not found. Please run database seed.');
		}

		const user = await this.prisma.user.create({
			data: {
				walletAddress: normalizedAddress,
				username: data.username,
				email: data.email,
				profileData: data.profileData || {},
				userRoles: {
					create: {
						roleId: userRole.id,
					},
				},
			},
			include: {
				userRoles: {
					include: {
						role: {
							include: {
								rolePermissions: {
									include: {
										permission: true,
									},
								},
							},
						},
					},
				},
			},
		});

		return user;
	}

	async getUserByWallet(walletAddress: string) {
		const normalizedAddress = this.normalizeWalletAddress(walletAddress);

		return this.prisma.user.findUnique({
			where: { walletAddress: normalizedAddress },
			include: {
				userRoles: {
					where: {
						OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
					},
					include: {
						role: {
							include: {
								rolePermissions: {
									include: {
										permission: true,
									},
								},
							},
						},
					},
				},
			},
		});
	}

	async getUserById(userId: string) {
		return this.prisma.user.findUnique({
			where: { id: userId },
			include: {
				userRoles: {
					where: {
						OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
					},
					include: {
						role: {
							include: {
								rolePermissions: {
									include: {
										permission: true,
									},
								},
							},
						},
					},
				},
			},
		});
	}

	async getAllUsers(includeInactive: boolean = false) {
		return this.prisma.user.findMany({
			where: includeInactive ? {} : { isActive: true },
			include: {
				userRoles: {
					where: {
						OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
					},
					include: {
						role: {
							include: {
								rolePermissions: {
									include: {
										permission: true,
									},
								},
							},
						},
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});
	}

	async updateProfile(userId: string, data: UpdateProfileDto) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${userId} not found`);
		}

		// Check for username conflicts
		if (data.username && data.username !== user.username) {
			const existingUsername = await this.prisma.user.findUnique({
				where: { username: data.username },
			});
			if (existingUsername) {
				throw new ConflictException(`Username ${data.username} is already taken`);
			}
		}

		// Check for email conflicts
		if (data.email && data.email !== user.email) {
			const existingEmail = await this.prisma.user.findUnique({
				where: { email: data.email },
			});
			if (existingEmail) {
				throw new ConflictException(`Email ${data.email} is already registered`);
			}
		}

		return this.prisma.user.update({
			where: { id: userId },
			data: {
				username: data.username,
				email: data.email,
				profileData: data.profileData ? { ...(user.profileData as object), ...data.profileData } : user.profileData,
			},
		});
	}

	async updateLastLogin(userId: string): Promise<void> {
		await this.prisma.user.update({
			where: { id: userId },
			data: { lastLogin: new Date() },
		});
	}

	async assignRole(userId: string, roleId: string, grantedBy?: string, expiresAt?: Date) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${userId} not found`);
		}

		const role = await this.prisma.role.findUnique({
			where: { id: roleId },
		});

		if (!role) {
			throw new NotFoundException(`Role with ID ${roleId} not found`);
		}

		// Check if user already has this role
		const existingUserRole = await this.prisma.userRole.findUnique({
			where: {
				userId_roleId: { userId, roleId },
			},
		});

		if (existingUserRole) {
			throw new ConflictException(`User already has role ${role.name}`);
		}

		return this.prisma.userRole.create({
			data: {
				userId,
				roleId,
				grantedBy,
				expiresAt,
			},
			include: { role: true },
		});
	}

	async removeRole(userId: string, roleId: string): Promise<void> {
		const userRole = await this.prisma.userRole.findUnique({
			where: {
				userId_roleId: { userId, roleId },
			},
		});

		if (!userRole) {
			throw new NotFoundException(`User does not have the specified role`);
		}

		await this.prisma.userRole.delete({
			where: {
				userId_roleId: { userId, roleId },
			},
		});
	}

	async getUserRoles(userId: string) {
		return this.prisma.userRole.findMany({
			where: {
				userId,
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
			include: {
				role: {
					include: {
						rolePermissions: {
							include: {
								permission: true,
							},
						},
					},
				},
			},
		});
	}

	async deactivateUser(userId: string) {
		return this.prisma.user.update({
			where: { id: userId },
			data: { isActive: false },
		});
	}

	async activateUser(userId: string) {
		return this.prisma.user.update({
			where: { id: userId },
			data: { isActive: true },
		});
	}
}
