import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { ChainId, ALCHEMY_CHAIN_SLUGS } from './wallet.types';

type ViemPublicClient = ReturnType<typeof createPublicClient>;

const CHAIN_DEFINITIONS: { chainId: ChainId; chain: Parameters<typeof createPublicClient>[0]['chain'] }[] = [
  { chainId: 1, chain: mainnet },
  // extend: { chainId: 100, chain: gnosis }, { chainId: 8453, chain: base }, { chainId: 42161, chain: arbitrum }
];

@Injectable()
export class WalletViemService {
  private readonly clients = new Map<ChainId, ViemPublicClient>();

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('alchemy.apiKey', '');

    for (const { chainId, chain } of CHAIN_DEFINITIONS) {
      const slug = ALCHEMY_CHAIN_SLUGS[chainId];
      this.clients.set(
        chainId,
        createPublicClient({
          chain,
          transport: http(`https://${slug}.g.alchemy.com/v2/${apiKey}`),
          batch: { multicall: { wait: 200 } },
        }),
      );
    }
  }

  getClient(chainId: ChainId): ViemPublicClient {
    const client = this.clients.get(chainId);
    if (!client) throw new Error(`No public client configured for chain ${chainId}`);
    return client;
  }
}
