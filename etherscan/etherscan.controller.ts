import { Controller, Get, Query, Param, Post, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EtherscanService } from './etherscan.service';
import { RequirePermission } from 'auth/decorators/require-permission.decorator';
import { GetAccountBalanceDto } from './dtos/GetAccountBalance.dto';
import { GetTransactionHistoryDto } from './dtos/GetTransactionHistory.dto';
import { GetTokenTransfersDto } from './dtos/GetTokenTransfers.dto';
import { GetTokenBalanceDto } from './dtos/GetTokenBalance.dto';
import { GetGasPriceDto } from './dtos/GetGasPrice.dto';
import { GetAddressTagDto } from './dtos/GetAddressTag.dto';
import { CacheType } from './etherscan.types';

@ApiTags('Etherscan')
@Controller('etherscan')
export class EtherscanController {
	constructor(private readonly etherscanService: EtherscanService) {}

	@Get('account/:address/balance')
	@RequirePermission('etherscan', 'read')
	@ApiOperation({
		summary: 'Get account ETH balance',
		description: 'Retrieves the ETH balance for a specific address on the specified chain',
	})
	@ApiParam({ name: 'address', description: 'Ethereum address' })
	@ApiQuery({ name: 'chainid', required: false, description: 'Chain ID (default: 1 for Ethereum)' })
	@ApiResponse({ status: 200, description: 'Account balance retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid address or parameters' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async getAccountBalance(@Param('address') address: string, @Query() query: GetAccountBalanceDto) {
		const balance = await this.etherscanService.getAccountBalance(address, query.chainid);
		return {
			address,
			chainid: query.chainid,
			balance,
		};
	}

	@Get('account/:address/transactions')
	@RequirePermission('etherscan', 'read')
	@ApiOperation({
		summary: 'Get account transaction history',
		description: 'Retrieves the transaction history for a specific address',
	})
	@ApiParam({ name: 'address', description: 'Ethereum address' })
	@ApiResponse({ status: 200, description: 'Transaction history retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid address or parameters' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async getTransactionHistory(@Param('address') address: string, @Query() query: GetTransactionHistoryDto) {
		const transactions = await this.etherscanService.getTransactionHistory(
			address,
			query.chainid,
			query.startblock,
			query.endblock,
			query.page,
			query.offset,
			query.sort
		);
		return {
			address,
			chainid: query.chainid,
			transactions,
		};
	}

	@Get('account/:address/internal-transactions')
	@RequirePermission('etherscan', 'read')
	@ApiOperation({
		summary: 'Get account internal transaction history',
		description: 'Retrieves the internal transaction history for a specific address',
	})
	@ApiParam({ name: 'address', description: 'Ethereum address' })
	@ApiResponse({ status: 200, description: 'Internal transaction history retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid address or parameters' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async getInternalTransactions(@Param('address') address: string, @Query() query: GetTransactionHistoryDto) {
		const transactions = await this.etherscanService.getInternalTransactions(
			address,
			query.chainid,
			query.startblock,
			query.endblock,
			query.page,
			query.offset,
			query.sort
		);
		return {
			address,
			chainid: query.chainid,
			transactions,
		};
	}

	@Get('account/:address/token-transfers')
	@RequirePermission('etherscan', 'read')
	@ApiOperation({
		summary: 'Get token transfer history',
		description: 'Retrieves the ERC-20 token transfer history for a specific address',
	})
	@ApiParam({ name: 'address', description: 'Ethereum address' })
	@ApiQuery({ name: 'contractaddress', required: false, description: 'Filter by specific token contract address' })
	@ApiResponse({ status: 200, description: 'Token transfer history retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid address or parameters' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async getTokenTransfers(@Param('address') address: string, @Query() query: GetTokenTransfersDto) {
		const transfers = await this.etherscanService.getTokenTransfers(
			address,
			query.chainid,
			query.contractaddress,
			query.startblock,
			query.endblock,
			query.page,
			query.offset,
			query.sort
		);
		return {
			address,
			chainid: query.chainid,
			contractaddress: query.contractaddress,
			transfers,
		};
	}

	@Get('account/:address/token-balances')
	@RequirePermission('etherscan', 'read')
	@ApiOperation({
		summary: 'Get account token balances',
		description: 'Retrieves all ERC-20 token balances for a specific address (PRO endpoint)',
	})
	@ApiParam({ name: 'address', description: 'Ethereum address' })
	@ApiQuery({ name: 'chainid', required: false, description: 'Chain ID (default: 1 for Ethereum)' })
	@ApiResponse({ status: 200, description: 'Token balances retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid address or parameters' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async getTokenBalances(@Param('address') address: string, @Query() query: GetTokenBalanceDto) {
		const balances = await this.etherscanService.getTokenBalance(address, query.chainid);
		return {
			address,
			chainid: query.chainid,
			balances,
		};
	}

	@Get('gas/price')
	@RequirePermission('etherscan', 'read')
	@ApiOperation({
		summary: 'Get current gas prices',
		description: 'Retrieves current gas price recommendations (Safe, Proposed, Fast)',
	})
	@ApiQuery({ name: 'chainid', required: false, description: 'Chain ID (default: 1 for Ethereum)' })
	@ApiResponse({ status: 200, description: 'Gas prices retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async getGasPrice(@Query() query: GetGasPriceDto) {
		const gasOracle = await this.etherscanService.getGasOracle(query.chainid);
		return {
			chainid: query.chainid,
			...gasOracle,
		};
	}

	@Get('address/:address/tag')
	@RequirePermission('etherscan', 'read')
	@ApiOperation({
		summary: 'Get address name tag',
		description: 'Retrieves name tag and labels for a specific address (PRO endpoint)',
	})
	@ApiParam({ name: 'address', description: 'Ethereum address' })
	@ApiQuery({ name: 'chainid', required: false, description: 'Chain ID (default: 1 for Ethereum)' })
	@ApiResponse({ status: 200, description: 'Address tag retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid address or parameters' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async getAddressTag(@Param('address') address: string, @Query() query: GetAddressTagDto) {
		const tag = await this.etherscanService.getAddressTag(address, query.chainid);
		return {
			address,
			chainid: query.chainid,
			...tag,
		};
	}

	@Get('block/:blockno/reward')
	@RequirePermission('etherscan', 'read')
	@ApiOperation({
		summary: 'Get block reward information',
		description: 'Retrieves block reward and uncle reward information for a specific block',
	})
	@ApiParam({ name: 'blockno', description: 'Block number' })
	@ApiQuery({ name: 'chainid', required: false, description: 'Chain ID (default: 1 for Ethereum)' })
	@ApiResponse({ status: 200, description: 'Block reward information retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid block number or parameters' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async getBlockReward(@Param('blockno') blockno: number, @Query() query: GetGasPriceDto) {
		const reward = await this.etherscanService.getBlockReward(blockno, query.chainid);
		return {
			blockno,
			chainid: query.chainid,
			...reward,
		};
	}

	@Get('cache/stats')
	@RequirePermission('etherscan', 'admin')
	@ApiOperation({
		summary: 'Get cache statistics',
		description: 'Retrieves cache statistics including memory and database cache entries',
	})
	@ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async getCacheStats() {
		return this.etherscanService.getCacheStats();
	}

	@Post('cache/cleanup')
	@RequirePermission('etherscan', 'admin')
	@ApiOperation({
		summary: 'Clean up expired cache entries',
		description: 'Manually triggers cleanup of expired cache entries from memory and database',
	})
	@ApiResponse({ status: 200, description: 'Cache cleanup completed successfully' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async cleanupCache() {
		await this.etherscanService.cleanupCache();
		return { message: 'Cache cleanup completed' };
	}

	@Delete('cache/:cacheType')
	@RequirePermission('etherscan', 'admin')
	@ApiOperation({
		summary: 'Invalidate cache by type',
		description: 'Invalidates all cache entries of a specific type',
	})
	@ApiParam({ name: 'cacheType', description: 'Cache type to invalidate', enum: CacheType })
	@ApiResponse({ status: 200, description: 'Cache invalidated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid cache type' })
	@ApiResponse({ status: 403, description: 'Insufficient permissions' })
	async invalidateCache(@Param('cacheType') cacheType: CacheType) {
		await this.etherscanService.invalidateCache(cacheType);
		return { message: `Cache invalidated for type: ${cacheType}` };
	}
}
