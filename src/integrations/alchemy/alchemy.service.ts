import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlchemyCacheService } from './alchemy.cache.service';
import {
  AlchemyRpcResponse,
  AssetTransfersResult,
  TokenBalancesResult,
  TokenBalance,
  CacheType,
} from './alchemy.types';

@Injectable()
export class AlchemyService {
  private readonly logger = new Logger(AlchemyService.name);
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: AlchemyCacheService,
  ) {
    this.apiKey = this.configService.get<string>('alchemy.apiKey') ?? '';
  }

  private url(chain: string): string {
    return `https://${chain}.g.alchemy.com/v2/${this.apiKey}`;
  }

  // ---------------------------------------------------------------------------
  // Core RPC helper
  // ---------------------------------------------------------------------------

  private async rpc<T>(chain: string, method: string, params: any[]): Promise<T> {
    let res: Response;
    try {
      res = await fetch(this.url(chain), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
    } catch (err) {
      this.logger.error(`Alchemy fetch failed: ${err.message}`);
      throw new BadGatewayException('Failed to reach Alchemy API');
    }

    const text = await res.text();

    if (!res.ok) {
      throw new BadGatewayException(`Alchemy: ${text.trim()}`);
    }

    let data: AlchemyRpcResponse<T>;
    try {
      data = JSON.parse(text);
    } catch {
      throw new BadGatewayException(`Alchemy: ${text.trim()}`);
    }

    if (data.error) {
      throw new BadGatewayException(`Alchemy: ${data.error.message}`);
    }

    return data.result as T;
  }

  private async cachedRpc<T>(
    chain: string,
    cacheType: CacheType,
    cacheKey: Record<string, any>,
    method: string,
    params: any[],
  ): Promise<T> {
    const key = { chain, ...cacheKey };
    const cached = await this.cache.get<T>(cacheType, key);
    if (cached) return cached;

    const result = await this.rpc<T>(chain, method, params);
    await this.cache.set(cacheType, key, result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Balance
  // ---------------------------------------------------------------------------

  async getBalance(chain: string, address: string): Promise<string> {
    const hex = await this.cachedRpc<string>(
      chain, CacheType.BALANCE, { address },
      'eth_getBalance', [address, 'latest'],
    );
    return BigInt(hex).toString();
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  async getTransactions(
    chain: string, address: string, direction: 'from' | 'to', limit: number, pageKey?: string,
  ): Promise<AssetTransfersResult> {
    return this.assetTransfers(chain, CacheType.TRANSACTIONS, {
      [direction === 'from' ? 'fromAddress' : 'toAddress']: address,
      category: ['external'],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: `0x${limit.toString(16)}`,
      ...(pageKey && { pageKey }),
    });
  }

  async getInternalTransactions(
    chain: string, address: string, direction: 'from' | 'to', limit: number, pageKey?: string,
  ): Promise<AssetTransfersResult> {
    return this.assetTransfers(chain, CacheType.INTERNAL_TXS, {
      [direction === 'from' ? 'fromAddress' : 'toAddress']: address,
      category: ['internal'],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: `0x${limit.toString(16)}`,
      ...(pageKey && { pageKey }),
    });
  }

  // ---------------------------------------------------------------------------
  // Token transfers
  // ---------------------------------------------------------------------------

  async getTokenTransfers(
    chain: string, address: string, direction: 'from' | 'to', limit: number, pageKey?: string,
  ): Promise<AssetTransfersResult> {
    return this.assetTransfers(chain, CacheType.TOKEN_TRANSFERS, {
      [direction === 'from' ? 'fromAddress' : 'toAddress']: address,
      category: ['erc20'],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: `0x${limit.toString(16)}`,
      ...(pageKey && { pageKey }),
    });
  }

  async getContractTokenTransfers(
    chain: string, address: string, contract: string, direction: 'from' | 'to', limit: number, pageKey?: string,
  ): Promise<AssetTransfersResult> {
    return this.assetTransfers(chain, CacheType.TOKEN_TRANSFERS, {
      [direction === 'from' ? 'fromAddress' : 'toAddress']: address,
      contractAddresses: [contract],
      category: ['erc20'],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: `0x${limit.toString(16)}`,
      ...(pageKey && { pageKey }),
    });
  }

  // ---------------------------------------------------------------------------
  // Token balances
  // ---------------------------------------------------------------------------

  async getTokenBalances(chain: string, address: string, pageKey?: string): Promise<TokenBalancesResult> {
    const params: any[] = [address, 'erc20'];
    if (pageKey) params.push({ pageKey });

    return this.cachedRpc<TokenBalancesResult>(
      chain, CacheType.TOKEN_BALANCES, { address, pageKey },
      'alchemy_getTokenBalances', params,
    );
  }

  async getTokenBalance(chain: string, address: string, contract: string): Promise<TokenBalance> {
    const result = await this.cachedRpc<TokenBalancesResult>(
      chain, CacheType.TOKEN_BALANCE, { address, contract },
      'alchemy_getTokenBalances', [address, [contract]],
    );
    return result.tokenBalances[0];
  }

  // ---------------------------------------------------------------------------
  // Cache management
  // ---------------------------------------------------------------------------

  getCacheStats() { return this.cache.getStats(); }

  async cleanupCache(): Promise<void> { await this.cache.cleanup(); }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async assetTransfers(
    chain: string, cacheType: CacheType, transferParams: Record<string, any>,
  ): Promise<AssetTransfersResult> {
    return this.cachedRpc<AssetTransfersResult>(
      chain, cacheType, transferParams,
      'alchemy_getAssetTransfers', [transferParams],
    );
  }
}
