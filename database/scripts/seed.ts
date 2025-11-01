import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding database...');

	// Create default permissions
	const permissions = [
		// User management
		{ resource: 'users', action: 'create', description: 'Create new users' },
		{ resource: 'users', action: 'read', description: 'View user information' },
		{ resource: 'users', action: 'update', description: 'Edit user profiles' },
		{ resource: 'users', action: 'delete', description: 'Delete user accounts' },

		// Role management
		{ resource: 'roles', action: 'create', description: 'Create new roles' },
		{ resource: 'roles', action: 'read', description: 'View role information' },
		{ resource: 'roles', action: 'update', description: 'Edit role details' },
		{ resource: 'roles', action: 'delete', description: 'Delete roles' },
		{ resource: 'roles', action: 'assign', description: 'Assign roles to users' },

		// Permission management
		{ resource: 'permissions', action: 'create', description: 'Create new permissions' },
		{ resource: 'permissions', action: 'read', description: 'View permission information' },
		{ resource: 'permissions', action: 'update', description: 'Edit permission details' },
		{ resource: 'permissions', action: 'delete', description: 'Delete permissions' },

		// System administration
		{ resource: 'system', action: 'admin', description: 'Full system administration' },
		{ resource: 'system', action: 'monitor', description: 'Monitor system health' },
		{ resource: 'system', action: 'status', description: 'Get system status' },

		// Etherscan integration
		{ resource: 'etherscan', action: 'read', description: 'Access Etherscan API data' },
		{ resource: 'etherscan', action: 'admin', description: 'Manage Etherscan cache and settings' },

		// Authorization processor
		{ resource: 'authorizations', action: 'create', description: 'Create new authorizations' },
		{ resource: 'authorizations', action: 'read', description: 'View authorization information' },
	];

	console.log('📝 Creating permissions...');
	for (const permission of permissions) {
		await prisma.permission.upsert({
			where: {
				resource_action: {
					resource: permission.resource,
					action: permission.action,
				},
			},
			update: {},
			create: permission,
		});
	}

	// Create default roles
	const adminRole = await prisma.role.upsert({
		where: { name: 'admin' },
		update: {},
		create: {
			name: 'admin',
			description: 'Full system administrator with all permissions',
			isSystem: true,
		},
	});

	const userRole = await prisma.role.upsert({
		where: { name: 'user' },
		update: {},
		create: {
			name: 'user',
			description: 'Standard user with basic permissions',
			isSystem: true,
		},
	});

	const moderatorRole = await prisma.role.upsert({
		where: { name: 'moderator' },
		update: {},
		create: {
			name: 'moderator',
			description: 'Moderator with user management permissions',
			isSystem: true,
		},
	});

	console.log('🔑 Assigning permissions to roles...');

	// Admin gets all permissions
	const allPermissions = await prisma.permission.findMany();
	for (const permission of allPermissions) {
		await prisma.rolePermission.upsert({
			where: {
				roleId_permissionId: {
					roleId: adminRole.id,
					permissionId: permission.id,
				},
			},
			update: {},
			create: {
				roleId: adminRole.id,
				permissionId: permission.id,
			},
		});
	}

	// User gets basic read permissions
	const userPermissions = await prisma.permission.findMany({
		where: {
			OR: [
				{ resource: 'system', action: 'status' },
				{ resource: 'etherscan', action: 'read' },
				{ resource: 'authorizations', action: 'read' },
			],
		},
	});

	for (const permission of userPermissions) {
		await prisma.rolePermission.upsert({
			where: {
				roleId_permissionId: {
					roleId: userRole.id,
					permissionId: permission.id,
				},
			},
			update: {},
			create: {
				roleId: userRole.id,
				permissionId: permission.id,
			},
		});
	}

	// Moderator gets user and role management permissions
	const moderatorPermissions = await prisma.permission.findMany({
		where: {
			OR: [
				{ resource: 'users' },
				{ resource: 'roles', action: 'read' },
				{ resource: 'roles', action: 'assign' },
				{ resource: 'system', action: 'monitor' },
				{ resource: 'system', action: 'status' },
				{ resource: 'etherscan', action: 'read' },
				{ resource: 'authorizations', action: 'read' },
				{ resource: 'authorizations', action: 'create' },
			],
		},
	});

	for (const permission of moderatorPermissions) {
		await prisma.rolePermission.upsert({
			where: {
				roleId_permissionId: {
					roleId: moderatorRole.id,
					permissionId: permission.id,
				},
			},
			update: {},
			create: {
				roleId: moderatorRole.id,
				permissionId: permission.id,
			},
		});
	}

	console.log('✅ Database seeded successfully!');
	console.log(`Created roles: ${adminRole.name}, ${userRole.name}, ${moderatorRole.name}`);
	console.log(`Created ${permissions.length} permissions`);
}

main()
	.catch((e) => {
		console.error('❌ Error seeding database:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
