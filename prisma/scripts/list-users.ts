/**
 * Lists all users and their granted scopes.
 * Usage: yarn db:list-users
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany({
      include: { scopes: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!users.length) {
      console.log('No users found.');
      return;
    }

    for (const user of users) {
      const handle = user.telegramHandle ? `@${user.telegramHandle}` : '(no handle)';
      const scopes = user.scopes.length ? user.scopes.map((s) => s.scopeKey).join(', ') : '(none)';
      console.log(`${handle} — ${user.id}`);
      console.log(`  scopes: ${scopes}`);
    }

    console.log(`\nTotal: ${users.length} user(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
