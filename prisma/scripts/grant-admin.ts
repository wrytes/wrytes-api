/**
 * Grants all known scopes to a user.
 * Usage: yarn db:grant-admin
 */

import { PrismaClient } from '@prisma/client';

const USER_ID = 'cmnkm1ziu0000n2z6p6ad7w9u';

const ALL_SCOPES: { key: string; description: string }[] = [
  { key: 'ADMIN',   description: 'Full access, bypasses all scope checks' },
  { key: 'USER',    description: 'Basic authenticated user access' },
  { key: 'AI',      description: 'Access to AI/LLM endpoints' },
  { key: 'ALCHEMY', description: 'Access to Alchemy on-chain data endpoints' },
  { key: 'WALLET',  description: 'Access to company wallet endpoints' },
  { key: 'KRAKEN',  description: 'Access to Kraken CEX endpoints' },
];

async function main() {
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({ where: { id: USER_ID } });
    if (!user) {
      console.error(`User ${USER_ID} not found`);
      process.exit(1);
    }

    console.log(`Granting scopes to @${user.telegramHandle} (${user.id})`);

    // Upsert all scope definitions
    for (const scope of ALL_SCOPES) {
      await prisma.scope.upsert({
        where: { key: scope.key },
        update: { description: scope.description },
        create: scope,
      });
    }

    // Grant every scope to the user
    for (const scope of ALL_SCOPES) {
      await prisma.userScope.upsert({
        where: { userId_scopeKey: { userId: USER_ID, scopeKey: scope.key } },
        update: {},
        create: { userId: USER_ID, scopeKey: scope.key },
      });
      console.log(`  ✓ ${scope.key}`);
    }

    console.log(`\nDone — ${ALL_SCOPES.length} scopes granted.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
