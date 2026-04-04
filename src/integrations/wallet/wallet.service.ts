import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWalletClient, http, WalletClient } from 'viem';
import { privateKeyToAccount, PrivateKeyAccount, Address } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { ChainId, CHAIN_NAMES, ALCHEMY_CHAIN_SLUGS } from './wallet.types';

const CHAIN_DEFINITIONS: Record<ChainId, any> = {
  1: mainnet,
  // extend: 100: gnosis, 8453: base, 42161: arbitrum
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  public readonly account: PrivateKeyAccount;
  public readonly address: Address;
  public readonly client: Record<ChainId, WalletClient>;

  constructor(private readonly configService: ConfigService) {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) throw new Error('WALLET_PRIVATE_KEY environment variable is required');

    const apiKey = this.configService.get<string>('alchemy.apiKey', '');

    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.address = this.account.address;
    this.client = this.buildWalletClients(apiKey);

    this.logger.log(`Wallet initialized: ${this.address}`);
  }

  private buildWalletClients(apiKey: string): Record<ChainId, WalletClient> {
    const clients: Partial<Record<ChainId, WalletClient>> = {};

    for (const [id, chain] of Object.entries(CHAIN_DEFINITIONS)) {
      const chainId = Number(id) as ChainId;
      const slug = ALCHEMY_CHAIN_SLUGS[chainId];
      clients[chainId] = createWalletClient({
        account: this.account,
        chain,
        transport: http(`https://${slug}.g.alchemy.com/v2/${apiKey}`),
      });
    }

    return clients as Record<ChainId, WalletClient>;
  }

  getChainName(chainId: ChainId): string {
    return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
  }
}
