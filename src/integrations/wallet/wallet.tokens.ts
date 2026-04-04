import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Address } from 'viem';
import { ChainId } from './wallet.types';
import { ENABLED_TOKENS } from '../../config/tokens.config';

export interface TokenInfo {
  address: Address;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

@Injectable()
export class WalletTokenList implements OnModuleInit {
  private readonly logger = new Logger(WalletTokenList.name);
  private tokensByChain: Map<ChainId, TokenInfo[]> = new Map();

  onModuleInit() {
    this.buildFromEnabledTokens();
  }

  private buildFromEnabledTokens(): void {
    this.tokensByChain.clear();

    for (const token of ENABLED_TOKENS) {
      for (const [chainId, address] of Object.entries(token.addresses)) {
        const id = Number(chainId) as ChainId;
        if (!this.tokensByChain.has(id)) this.tokensByChain.set(id, []);
        this.tokensByChain.get(id)!.push({
          address: address as Address,
          chainId: id,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
        });
      }
    }

    this.logger.log(`Loaded ${ENABLED_TOKENS.length} tokens`);
  }

  getTokensByChain(chainId: ChainId): TokenInfo[] {
    return this.tokensByChain.get(chainId) ?? [];
  }

  getTokenAddresses(chainId: ChainId): Address[] {
    return this.getTokensByChain(chainId).map((t) => t.address);
  }

  getTokenInfo(chainId: ChainId, address: Address): TokenInfo | undefined {
    return this.getTokensByChain(chainId).find(
      (t) => t.address.toLowerCase() === address.toLowerCase(),
    );
  }

  getAllTokens(): TokenInfo[] {
    return [...this.tokensByChain.values()].flat();
  }
}
