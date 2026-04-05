/**
 * Deploys a Safe wallet contract on-chain for a given safeWalletId.
 * The Safe address is pre-computed (CREATE2) so funds can be received before deployment,
 * but executeTransfer will fail if the Safe is not deployed. Run this before your first deposit.
 *
 * Usage:
 *   yarn script:deploy-safe <safeWalletId>
 *
 * Example:
 *   yarn script:deploy-safe cmnlslvlu0001n2rrmfg12y6g
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import Safe from '@safe-global/protocol-kit';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const SAFE_WALLET_ID = process.argv[2];

const ALCHEMY_SLUGS: Record<number, string> = {
  1: 'eth-mainnet',
};

function rpcUrl(chainId: number): string {
  const slug = ALCHEMY_SLUGS[chainId];
  if (!slug) throw new Error(`Unsupported chainId: ${chainId}`);
  return `https://${slug}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
}

async function main() {
  if (!SAFE_WALLET_ID) {
    console.error('Usage: yarn script:deploy-safe <safeWalletId>');
    process.exit(1);
  }

  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) throw new Error('WALLET_PRIVATE_KEY is not set');

  const prisma = new PrismaClient();

  try {
    const safeWallet = await prisma.safeWallet.findUnique({ where: { id: SAFE_WALLET_ID } });
    if (!safeWallet) {
      console.error(`Safe wallet ${SAFE_WALLET_ID} not found`);
      process.exit(1);
    }

    const chainId = safeWallet.chainId as 1;
    const rpc = rpcUrl(chainId);

    console.log(`Safe wallet : ${safeWallet.id}`);
    console.log(`Address     : ${safeWallet.address}`);
    console.log(`Chain       : ${chainId}`);
    console.log(`Deployed    : ${safeWallet.deployed}`);
    console.log();

    // Check on-chain state first
    const publicClient = createPublicClient({ chain: mainnet, transport: http(rpc) });
    const code = await publicClient.getBytecode({ address: safeWallet.address as `0x${string}` });
    const isDeployedOnChain = !!code && code !== '0x';

    if (isDeployedOnChain) {
      console.log('Safe is already deployed on-chain.');
      if (!safeWallet.deployed) {
        await prisma.safeWallet.update({
          where: { id: safeWallet.id },
          data: { deployed: true, deployedAt: new Date() },
        });
        console.log('Updated DB record: deployed = true');
      }
      return;
    }

    console.log('Safe not yet deployed — deploying now...');
    console.log('(Operator wallet needs ETH for gas)');
    console.log();

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log(`Operator    : ${account.address}`);

    const sdk = await Safe.init({
      provider: rpc,
      signer: privateKey,
      isL1SafeSingleton: chainId === 1,
      predictedSafe: {
        safeAccountConfig: {
          owners: [account.address],
          threshold: 1,
        },
        safeDeploymentConfig: {
          saltNonce: safeWallet.saltNonce,
          safeVersion: '1.4.1',
        },
      },
    });

    const predictedAddress = await sdk.getAddress();
    if (predictedAddress.toLowerCase() !== safeWallet.address.toLowerCase()) {
      console.error(`Address mismatch — predicted: ${predictedAddress}, DB: ${safeWallet.address}`);
      console.error('Check that WALLET_PRIVATE_KEY matches the one used during route creation.');
      process.exit(1);
    }

    const deployTx = await sdk.createSafeDeploymentTransaction();

    const walletClient = (await import('viem')).createWalletClient({
      account,
      chain: mainnet,
      transport: http(rpc),
    });

    const hash = await walletClient.sendTransaction({
      account,
      chain: null,
      to: deployTx.to as `0x${string}`,
      data: deployTx.data as `0x${string}`,
      value: BigInt(deployTx.value ?? 0),
    });

    console.log(`Deploy tx sent: ${hash}`);
    console.log('Waiting for confirmation...');

    await publicClient.waitForTransactionReceipt({ hash });

    await prisma.safeWallet.update({
      where: { id: safeWallet.id },
      data: { deployed: true, deployedAt: new Date() },
    });

    console.log();
    console.log(`Safe deployed at ${safeWallet.address}`);
    console.log('You can now safely send funds to the deposit address.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
