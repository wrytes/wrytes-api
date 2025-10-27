import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ETHERSCAN_CLIENT } from '../api.config';
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
	EtherscanError,
} from './etherscan.types';

@Injectable()
export class EtherscanService {
	private readonly logger = new Logger(EtherscanService.name);

	constructor(private readonly cacheService: EtherscanCacheService) {}

	private async makeRequest<T>(params: Map<string, string>, cacheType: CacheType): Promise<T> {
		const cacheParams = Object.fromEntries(params.entries());

		// Try cache first
		const cached = await this.cacheService.get<T>(cacheType, cacheParams);
		if (cached) {
			return cached;
		}

		try {
			this.logger.debug(`Making Etherscan API request: ${JSON.stringify(cacheParams)}`);

			const response = await ETHERSCAN_CLIENT(params);

			if (!response.ok) {
				throw new InternalServerErrorException(`Etherscan API returned ${response.status}: ${response.statusText}`);
			}

			const data: EtherscanApiResponse<T> = await response.json();

			if (data.status === '0') {
				const error = data as unknown as EtherscanError;
				throw new BadRequestException(`Etherscan API error: ${error.message}`);
			}

			// Cache the result
			await this.cacheService.set(cacheType, cacheParams, data.result);

			return data.result;
		} catch (error) {
			if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
				throw error;
			}

			this.logger.error(`Etherscan API request failed: ${error.message}`);
			throw new InternalServerErrorException('Failed to fetch data from Etherscan');
		}
	}

	async getAccountBalance(address: string, chainid: number = 1): Promise<string> {
		const params = new Map([
			['chainid', chainid.toString()],
			['module', 'account'],
			['action', 'balance'],
			['address', address],
			['tag', 'latest'],
		]);

		return this.makeRequest<string>(params, CacheType.BALANCE);
	}

	async getAccountBalances(addresses: string[], chainid: number = 1): Promise<AccountBalance[]> {
		const params = new Map([
			['chainid', chainid.toString()],
			['module', 'account'],
			['action', 'balancemulti'],
			['address', addresses.join(',')],
			['tag', 'latest'],
		]);

		return this.makeRequest<AccountBalance[]>(params, CacheType.BALANCE);
	}

	async getTransactionHistory(
		address: string,
		chainid: number = 1,
		startblock: number = 0,
		endblock: number = 99999999,
		page: number = 1,
		offset: number = 10,
		sort: string = 'desc'
	): Promise<Transaction[]> {
		const params = new Map([
			['chainid', chainid.toString()],
			['module', 'account'],
			['action', 'txlist'],
			['address', address],
			['startblock', startblock.toString()],
			['endblock', endblock.toString()],
			['page', page.toString()],
			['offset', offset.toString()],
			['sort', sort],
		]);

		return this.makeRequest<Transaction[]>(params, CacheType.TRANSACTIONS);
	}

	async getInternalTransactions(
		address: string,
		chainid: number = 1,
		startblock: number = 0,
		endblock: number = 99999999,
		page: number = 1,
		offset: number = 10,
		sort: string = 'desc'
	): Promise<Transaction[]> {
		const params = new Map([
			['chainid', chainid.toString()],
			['module', 'account'],
			['action', 'txlistinternal'],
			['address', address],
			['startblock', startblock.toString()],
			['endblock', endblock.toString()],
			['page', page.toString()],
			['offset', offset.toString()],
			['sort', sort],
		]);

		return this.makeRequest<Transaction[]>(params, CacheType.TRANSACTIONS);
	}

	async getTokenTransfers(
		address: string,
		chainid: number = 1,
		contractaddress?: string,
		startblock: number = 0,
		endblock: number = 99999999,
		page: number = 1,
		offset: number = 10,
		sort: string = 'desc'
	): Promise<TokenTransfer[]> {
		const params = new Map([
			['chainid', chainid.toString()],
			['module', 'account'],
			['action', 'tokentx'],
			['address', address],
			['startblock', startblock.toString()],
			['endblock', endblock.toString()],
			['page', page.toString()],
			['offset', offset.toString()],
			['sort', sort],
		]);

		if (contractaddress) {
			params.set('contractaddress', contractaddress);
		}

		return this.makeRequest<TokenTransfer[]>(params, CacheType.TOKEN_TRANSFERS);
	}

	async getTokenBalance(address: string, chainid: number = 1): Promise<TokenBalance[]> {
		const params = new Map([
			['chainid', chainid.toString()],
			['module', 'account'],
			['action', 'accountbalance'],
			['address', address],
			['page', '1'],
			['offset', '100'],
		]);

		return this.makeRequest<TokenBalance[]>(params, CacheType.TOKEN_BALANCE);
	}

	async getGasOracle(chainid: number = 1): Promise<GasOracle> {
		const params = new Map([
			['chainid', chainid.toString()],
			['module', 'gastracker'],
			['action', 'gasoracle'],
		]);

		return this.makeRequest<GasOracle>(params, CacheType.GAS_ORACLE);
	}

	async getAddressTag(address: string, chainid: number = 1): Promise<AddressTag> {
		const params = new Map([
			['chainid', chainid.toString()],
			['module', 'nametag'],
			['action', 'getaddresstag'],
			['address', address],
		]);

		return this.makeRequest<AddressTag>(params, CacheType.ADDRESS_TAG);
	}

	async getBlockReward(blockno: number, chainid: number = 1): Promise<any> {
		const params = new Map([
			['chainid', chainid.toString()],
			['module', 'block'],
			['action', 'getblockreward'],
			['blockno', blockno.toString()],
		]);

		return this.makeRequest<any>(params, CacheType.BLOCK_INFO);
	}

	async invalidateCache(cacheType: CacheType, params?: Record<string, any>): Promise<void> {
		await this.cacheService.invalidate(cacheType, params);
	}

	async getCacheStats(): Promise<{ memoryEntries: number; dbEntries?: number }> {
		return this.cacheService.getCacheStats();
	}

	async cleanupCache(): Promise<void> {
		await this.cacheService.cleanup();
	}
}
