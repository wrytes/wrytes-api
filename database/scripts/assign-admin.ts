import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function assignAdminRole() {
	// Check if DATABASE_URL is set
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error('❌ DATABASE_URL environment variable is not set');
		process.exit(1);
	}

	const targetWalletAddress = '0x0170f42f224b99ccbbee673093589c5f9691dd06';

	try {
		console.log('🔍 Checking database connection...');
		await prisma.$connect();

		console.log(`🎯 Assigning admin role to wallet: ${targetWalletAddress}`);

		// Find or create the user
		let user = await prisma.user.findUnique({
			where: { walletAddress: targetWalletAddress },
		});

		if (!user) {
			console.log('👤 Creating new user...');
			user = await prisma.user.create({
				data: {
					walletAddress: targetWalletAddress,
					username: `admin_${targetWalletAddress.slice(2, 8)}`,
					isActive: true,
				},
			});
			console.log(`✅ Created user with ID: ${user.id}`);
		} else {
			console.log(`✅ Found existing user with ID: ${user.id}`);
		}

		// Find the admin role
		const adminRole = await prisma.role.findUnique({
			where: { name: 'admin' },
		});

		if (!adminRole) {
			console.error('❌ Admin role not found. Please run the seed script first.');
			process.exit(1);
		}

		// Check if user already has admin role
		const existingUserRole = await prisma.userRole.findUnique({
			where: {
				userId_roleId: {
					userId: user.id,
					roleId: adminRole.id,
				},
			},
		});

		if (existingUserRole) {
			console.log('✅ User already has admin role');
		} else {
			// Assign admin role to user
			await prisma.userRole.create({
				data: {
					userId: user.id,
					roleId: adminRole.id,
					grantedAt: new Date(),
				},
			});
			console.log('✅ Successfully assigned admin role to user');
		}

		console.log('🎉 Admin role assignment completed successfully!');
		console.log(`User ID: ${user.id}`);
		console.log(`Wallet Address: ${user.walletAddress}`);
		console.log(`Role: ${adminRole.name}`);
	} catch (error) {
		console.error('❌ Error assigning admin role:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

assignAdminRole();
