/**
 * Removes a user and all related data (scopes, API keys, magic links).
 * Usage: yarn db:remove-user <userId>
 */

import { PrismaClient } from '@prisma/client';

const USER_ID = process.argv[2];

async function main() {
  if (!USER_ID) {
    console.error('Usage: yarn db:remove-user <userId>');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({ where: { id: USER_ID } });
    if (!user) {
      console.error(`User ${USER_ID} not found`);
      process.exit(1);
    }

    const handle = user.telegramHandle ? `@${user.telegramHandle}` : '(no handle)';
    console.log(`Removing user ${handle} (${user.id})...`);

    await prisma.user.delete({ where: { id: USER_ID } });

    console.log('Done.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
