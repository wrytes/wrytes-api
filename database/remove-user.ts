import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function removeUser() {
	// Check if DATABASE_URL is set
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error('❌ DATABASE_URL environment variable is not set');
		process.exit(1);
	}

	const userId = 'cmdswerif0000n2iscmrap4wj';

	try {
		console.log('🔍 Checking database connection...');
		await prisma.$connect();

		console.log(`🗑️  Removing user with ID: ${userId}`);

		// First, check if the user exists
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				userRoles: {
					include: {
						role: true
					}
				}
			}
		});

		if (!user) {
			console.error('❌ User not found with the specified ID');
			process.exit(1);
		}

		console.log('👤 User details:');
		console.log(`   ID: ${user.id}`);
		console.log(`   Wallet Address: ${user.walletAddress}`);
		console.log(`   Username: ${user.username || 'N/A'}`);
		console.log(`   Email: ${user.email || 'N/A'}`);
		console.log(`   Active: ${user.isActive}`);
		console.log(`   Created: ${user.createdAt}`);
		console.log(`   Roles: ${user.userRoles.map(ur => ur.role.name).join(', ') || 'None'}`);

		// Confirm deletion
		console.log('\n⚠️  WARNING: This will permanently delete the user and all associated data!');
		console.log('   - User profile will be deleted');
		console.log('   - All role assignments will be removed');
		console.log('   - This action cannot be undone');
		
		// In a real scenario, you might want to add a confirmation prompt
		// For now, we'll proceed with the deletion
		console.log('\n🗑️  Proceeding with user deletion...');

		// Delete user (this will cascade delete user_roles due to foreign key constraints)
		await prisma.user.delete({
			where: { id: userId }
		});

		console.log('✅ User successfully removed from database');
		console.log(`   Deleted user ID: ${userId}`);

	} catch (error) {
		console.error('❌ Error removing user:', error);
		
		if (error.code === 'P2025') {
			console.error('   User not found or already deleted');
		} else if (error.code === 'P2003') {
			console.error('   Foreign key constraint violation - user may have active references');
		}
		
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

removeUser(); 