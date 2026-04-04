import {
  Injectable,
  Logger,
  BadGatewayException,
} from '@nestjs/common';
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
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: AlchemyCacheService,
  ) {
    const apiKey = this.configService.get<string>('alchemy.apiKey') ?? '';
    const network = this.configService.get<string>('alchemy.network') ?? 'eth-mainnet';
    this.baseUrl = `https://${network}.g.alchemy.com/v2/${apiKey}`;
  }

  // ---------------------------------------------------------------------------
  // Core RPC helper
  // ---------------------------------------------------------------------------

  private async rpc<T>(method: string, params: any[]): Promise<T> {
    let res: Response;
    try {
      res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
    } catch (err) {
      this.logger.error(`Alchemy fetch failed: ${err.message}`);
      throw new BadGatewayException('Failed to reach Alchemy API');
    }

    const data: AlchemyRpcResponse<T> = await res.json();

    if (data.error) {
      throw new BadGatewayException(`Alchemy: ${data.error.message}`);
    }

    return data.result as T;
  }

  private async cachedRpc<T>(
    cacheType: CacheType,
    cacheKey: Record<string, any>,
    method: string,
    params: any[],
  ): Promise<T> {
    const cached = await this.cache.get<T>(cacheType, cacheKey);
    if (cached) return cached;

    const result = await this.rpc<T>(method, params);
    await this.cache.set(cacheType, cacheKey, result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Balance
  // ---------------------------------------------------------------------------

  async getBalance(address: string): Promise<string> {
    const hex = await this.cachedRpc<string>(
      CacheType.BALANCE,
      { address },
      'eth_getBalance',
      [address, 'latest'],
    );
    return BigInt(hex).toString();
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  async getTransactions(
    address: string,
    direction: 'from' | 'to',
    limit: number,
    pageKey?: string,
  ): Promise<AssetTransfersResult> {
    return this.getAssetTransfers(CacheType.TRANSACTIONS, {
      [direction === 'from' ? 'fromAddress' : 'toAddress']: address,
      category: ['external'],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: `0x${limit.toString(16)}`,
      ...(pageKey && { pageKey }),
    });
  }

  async getInternalTransactions(
    address: string,
    direction: 'from' | 'to',
    limit: number,
    pageKey?: string,
  ): Promise<AssetTransfersResult> {
    return this.getAssetTransfers(CacheType.INTERNAL_TXS, {
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
    address: string,
    direction: 'from' | 'to',
    limit: number,
    pageKey?: string,
  ): Promise<AssetTransfersResult> {
    return this.getAssetTransfers(CacheType.TOKEN_TRANSFERS, {
      [direction === 'from' ? 'fromAddress' : 'toAddress']: address,
      category: ['erc20'],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: `0x${limit.toString(16)}`,
      ...(pageKey && { pageKey }),
    });
  }

  async getContractTokenTransfers(
    address: string,
    contract: string,
    direction: 'from' | 'to',
    limit: number,
    pageKey?: string,
  ): Promise<AssetTransfersResult> {
    return this.getAssetTransfers(CacheType.TOKEN_TRANSFERS, {
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

  async getTokenBalances(address: string, pageKey?: string): Promise<TokenBalancesResult> {
    const params: any[] = [address, 'erc20'];
    if (pageKey) params.push({ pageKey });

    return this.cachedRpc<TokenBalancesResult>(
      CacheType.TOKEN_BALANCES,
      { address, pageKey },
      'alchemy_getTokenBalances',
      params,
    );
  }

  async getTokenBalance(address: string, contract: string): Promise<TokenBalance> {
    const result = await this.cachedRpc<TokenBalancesResult>(
      CacheType.TOKEN_BALANCE,
      { address, contract },
      'alchemy_getTokenBalances',
      [address, [contract]],
    );
    return result.tokenBalances[0];
  }

  // ---------------------------------------------------------------------------
  // Cache management
  // ---------------------------------------------------------------------------

  getCacheStats() {
    return this.cache.getStats();
  }

  async cleanupCache(): Promise<void> {
    await this.cache.cleanup();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async getAssetTransfers(
    cacheType: CacheType,
    transferParams: Record<string, any>,
  ): Promise<AssetTransfersResult> {
    return this.cachedRpc<AssetTransfersResult>(
      cacheType,
      transferParams,
      'alchemy_getAssetTransfers',
      [transferParams],
    );
  }
}
