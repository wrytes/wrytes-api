import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EtherscanCacheService } from './etherscan.cache.service';
import {
  EtherscanApiResponse,
  AccountBalance,
  Transaction,
  TokenTransfer,
  TokenBalance,
  GasOracle,
  AddressTag,
  CacheType,
} from './etherscan.types';

@Injectable()
export class EtherscanService {
  private readonly logger = new Logger(EtherscanService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: EtherscanCacheService,
  ) {
    this.apiKey = this.configService.get<string>('etherscan.apiKey') ?? '';
    this.baseUrl = this.configService.get<string>('etherscan.baseUrl') ?? 'https://api.etherscan.io/v2/api';
  }

  private async request<T>(params: Record<string, string>, cacheType: CacheType): Promise<T> {
    const cached = await this.cache.get<T>(cacheType, params);
    if (cached) return cached;

    const query = new URLSearchParams({ ...params, apikey: this.apiKey });
    const url = `${this.baseUrl}?${query}`;

    this.logger.debug(`Etherscan request: ${cacheType}`);

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      this.logger.error(`Etherscan fetch failed: ${err.message}`);
      throw new InternalServerErrorException('Failed to reach Etherscan API');
    }

    if (!res.ok) {
      throw new InternalServerErrorException(`Etherscan API error: ${res.status} ${res.statusText}`);
    }

    const data: EtherscanApiResponse<T> = await res.json();

    if (data.status === '0') {
      throw new BadRequestException(`Etherscan: ${data.message}`);
    }

    await this.cache.set(cacheType, params, data.result);
    return data.result;
  }

  async getAccountBalance(address: string, chainid = 1): Promise<string> {
    return this.request<string>(
      { chainid: String(chainid), module: 'account', action: 'balance', address, tag: 'latest' },
      CacheType.BALANCE,
    );
  }

  async getAccountBalances(addresses: string[], chainid = 1): Promise<AccountBalance[]> {
    return this.request<AccountBalance[]>(
      { chainid: String(chainid), module: 'account', action: 'balancemulti', address: addresses.join(','), tag: 'latest' },
      CacheType.BALANCE,
    );
  }

  async getTransactionHistory(
    address: string,
    chainid = 1,
    startblock = 0,
    endblock = 99999999,
    page = 1,
    offset = 10,
    sort: 'asc' | 'desc' = 'desc',
  ): Promise<Transaction[]> {
    return this.request<Transaction[]>(
      { chainid: String(chainid), module: 'account', action: 'txlist', address, startblock: String(startblock), endblock: String(endblock), page: String(page), offset: String(offset), sort },
      CacheType.TRANSACTIONS,
    );
  }

  async getInternalTransactions(
    address: string,
    chainid = 1,
    startblock = 0,
    endblock = 99999999,
    page = 1,
    offset = 10,
    sort: 'asc' | 'desc' = 'desc',
  ): Promise<Transaction[]> {
    return this.request<Transaction[]>(
      { chainid: String(chainid), module: 'account', action: 'txlistinternal', address, startblock: String(startblock), endblock: String(endblock), page: String(page), offset: String(offset), sort },
      CacheType.TRANSACTIONS,
    );
  }

  async getTokenTransfers(
    address: string,
    chainid = 1,
    contractaddress?: string,
    startblock = 0,
    endblock = 99999999,
    page = 1,
    offset = 10,
    sort: 'asc' | 'desc' = 'desc',
  ): Promise<TokenTransfer[]> {
    const params: Record<string, string> = { chainid: String(chainid), module: 'account', action: 'tokentx', address, startblock: String(startblock), endblock: String(endblock), page: String(page), offset: String(offset), sort };
    if (contractaddress) params.contractaddress = contractaddress;
    return this.request<TokenTransfer[]>(params, CacheType.TOKEN_TRANSFERS);
  }

  async getTokenBalance(address: string, chainid = 1): Promise<TokenBalance[]> {
    return this.request<TokenBalance[]>(
      { chainid: String(chainid), module: 'account', action: 'accountbalance', address, page: '1', offset: '100' },
      CacheType.TOKEN_BALANCE,
    );
  }

  async getGasOracle(chainid = 1): Promise<GasOracle> {
    return this.request<GasOracle>(
      { chainid: String(chainid), module: 'gastracker', action: 'gasoracle' },
      CacheType.GAS_ORACLE,
    );
  }

  async getAddressTag(address: string, chainid = 1): Promise<AddressTag> {
    return this.request<AddressTag>(
      { chainid: String(chainid), module: 'nametag', action: 'getaddresstag', address },
      CacheType.ADDRESS_TAG,
    );
  }

  async getBlockReward(blockno: number, chainid = 1): Promise<any> {
    return this.request<any>(
      { chainid: String(chainid), module: 'block', action: 'getblockreward', blockno: String(blockno) },
      CacheType.BLOCK_INFO,
    );
  }

  async invalidateCache(cacheType: CacheType, params?: Record<string, any>): Promise<void> {
    await this.cache.invalidate(cacheType, params);
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  async cleanupCache(): Promise<void> {
    await this.cache.cleanup();
  }
}
