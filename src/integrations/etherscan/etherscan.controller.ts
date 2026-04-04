import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { EtherscanService } from './etherscan.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { Scope } from '@prisma/client';
import { GetAccountBalanceDto } from './dtos/GetAccountBalance.dto';
import { GetTransactionHistoryDto } from './dtos/GetTransactionHistory.dto';
import { GetTokenTransfersDto } from './dtos/GetTokenTransfers.dto';
import { GetTokenBalanceDto } from './dtos/GetTokenBalance.dto';
import { GetGasPriceDto } from './dtos/GetGasPrice.dto';
import { GetAddressTagDto } from './dtos/GetAddressTag.dto';
import { CacheType } from './etherscan.types';

@ApiTags('Etherscan')
@Controller('etherscan')
@UseGuards(ApiKeyGuard, ScopesGuard)
@ApiSecurity('api-key')
export class EtherscanController {
  constructor(private readonly etherscanService: EtherscanService) {}

  @Get('account/:address/balance')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get account ETH balance' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({ name: 'chainid', required: false, description: 'Chain ID (default: 1)' })
  @ApiResponse({ status: 200 })
  async getAccountBalance(
    @Param('address') address: string,
    @Query() query: GetAccountBalanceDto,
  ) {
    const balance = await this.etherscanService.getAccountBalance(address, query.chainid);
    return { address, chainid: query.chainid, balance };
  }

  @Get('account/:address/transactions')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get account transaction history' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiResponse({ status: 200 })
  async getTransactionHistory(
    @Param('address') address: string,
    @Query() query: GetTransactionHistoryDto,
  ) {
    const transactions = await this.etherscanService.getTransactionHistory(
      address, query.chainid, query.startblock, query.endblock, query.page, query.offset, query.sort,
    );
    return { address, chainid: query.chainid, transactions };
  }

  @Get('account/:address/internal-transactions')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get account internal transactions' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiResponse({ status: 200 })
  async getInternalTransactions(
    @Param('address') address: string,
    @Query() query: GetTransactionHistoryDto,
  ) {
    const transactions = await this.etherscanService.getInternalTransactions(
      address, query.chainid, query.startblock, query.endblock, query.page, query.offset, query.sort,
    );
    return { address, chainid: query.chainid, transactions };
  }

  @Get('account/:address/token-transfers')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get ERC-20 token transfer history' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({ name: 'contractaddress', required: false })
  @ApiResponse({ status: 200 })
  async getTokenTransfers(
    @Param('address') address: string,
    @Query() query: GetTokenTransfersDto,
  ) {
    const transfers = await this.etherscanService.getTokenTransfers(
      address, query.chainid, query.contractaddress, query.startblock, query.endblock, query.page, query.offset, query.sort,
    );
    return { address, chainid: query.chainid, contractaddress: query.contractaddress, transfers };
  }

  @Get('account/:address/token-balances')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get ERC-20 token balances (PRO)' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiResponse({ status: 200 })
  async getTokenBalances(
    @Param('address') address: string,
    @Query() query: GetTokenBalanceDto,
  ) {
    const balances = await this.etherscanService.getTokenBalance(address, query.chainid);
    return { address, chainid: query.chainid, balances };
  }

  @Get('gas/price')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get current gas prices' })
  @ApiQuery({ name: 'chainid', required: false })
  @ApiResponse({ status: 200 })
  async getGasPrice(@Query() query: GetGasPriceDto) {
    const gasOracle = await this.etherscanService.getGasOracle(query.chainid);
    return { chainid: query.chainid, ...gasOracle };
  }

  @Get('address/:address/tag')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get address name tag (PRO)' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiResponse({ status: 200 })
  async getAddressTag(
    @Param('address') address: string,
    @Query() query: GetAddressTagDto,
  ) {
    const tag = await this.etherscanService.getAddressTag(address, query.chainid);
    return { address, chainid: query.chainid, ...tag };
  }

  @Get('block/:blockno/reward')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get block reward information' })
  @ApiParam({ name: 'blockno', description: 'Block number' })
  @ApiResponse({ status: 200 })
  async getBlockReward(
    @Param('blockno', ParseIntPipe) blockno: number,
    @Query() query: GetGasPriceDto,
  ) {
    const reward = await this.etherscanService.getBlockReward(blockno, query.chainid);
    return { blockno, chainid: query.chainid, ...reward };
  }

  @Get('cache/stats')
  @RequireScopes(Scope.ADMIN)
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200 })
  getCacheStats() {
    return this.etherscanService.getCacheStats();
  }

  @Post('cache/cleanup')
  @RequireScopes(Scope.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger cleanup of expired cache entries' })
  @ApiResponse({ status: 200 })
  async cleanupCache() {
    await this.etherscanService.cleanupCache();
    return { message: 'Cache cleanup completed' };
  }

  @Delete('cache/:cacheType')
  @RequireScopes(Scope.ADMIN)
  @ApiOperation({ summary: 'Invalidate cache by type' })
  @ApiParam({ name: 'cacheType', enum: CacheType })
  @ApiResponse({ status: 200 })
  async invalidateCache(@Param('cacheType') cacheType: CacheType) {
    await this.etherscanService.invalidateCache(cacheType);
    return { message: `Cache invalidated for type: ${cacheType}` };
  }
}
