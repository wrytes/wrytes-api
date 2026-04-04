import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { AlchemyService } from './alchemy.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { Scope } from '@prisma/client';
import { ListQueryDto } from './dtos/ListQuery.dto';
import { TokenBalancesQueryDto } from './dtos/TokenBalancesQuery.dto';

@ApiTags('Alchemy')
@Controller('account')
@UseGuards(ApiKeyGuard, ScopesGuard)
@ApiSecurity('api-key')
export class AlchemyController {
  constructor(private readonly alchemyService: AlchemyService) {}

  // ---------------------------------------------------------------------------
  // Balance
  // ---------------------------------------------------------------------------

  @Get(':address/balance')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get ETH balance (wei)' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiResponse({ status: 200 })
  async getBalance(@Param('address') address: string) {
    const balance = await this.alchemyService.getBalance(address);
    return { address, balance };
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  @Get(':address/transactions')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get external transactions' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({ name: 'direction', enum: ['from', 'to'], required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pageKey', required: false })
  @ApiResponse({ status: 200 })
  async getTransactions(@Param('address') address: string, @Query() query: ListQueryDto) {
    return this.alchemyService.getTransactions(address, query.direction, query.limit, query.pageKey);
  }

  @Get(':address/internal-transactions')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get internal transactions' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({ name: 'direction', enum: ['from', 'to'], required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pageKey', required: false })
  @ApiResponse({ status: 200 })
  async getInternalTransactions(@Param('address') address: string, @Query() query: ListQueryDto) {
    return this.alchemyService.getInternalTransactions(address, query.direction, query.limit, query.pageKey);
  }

  // ---------------------------------------------------------------------------
  // Token (contract-scoped)
  // ---------------------------------------------------------------------------

  @Get(':address/token/:contract/transfers')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get ERC-20 transfers for a specific token' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiParam({ name: 'contract', description: 'ERC-20 contract address' })
  @ApiQuery({ name: 'direction', enum: ['from', 'to'], required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pageKey', required: false })
  @ApiResponse({ status: 200 })
  async getContractTokenTransfers(
    @Param('address') address: string,
    @Param('contract') contract: string,
    @Query() query: ListQueryDto,
  ) {
    return this.alchemyService.getContractTokenTransfers(address, contract, query.direction, query.limit, query.pageKey);
  }

  @Get(':address/token/:contract/balance')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get ERC-20 balance for a specific token' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiParam({ name: 'contract', description: 'ERC-20 contract address' })
  @ApiResponse({ status: 200 })
  async getTokenBalance(
    @Param('address') address: string,
    @Param('contract') contract: string,
  ) {
    return this.alchemyService.getTokenBalance(address, contract);
  }

  // ---------------------------------------------------------------------------
  // Token (address-scoped)
  // ---------------------------------------------------------------------------

  @Get(':address/token-balances')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get all ERC-20 token balances' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({ name: 'pageKey', required: false })
  @ApiResponse({ status: 200 })
  async getTokenBalances(@Param('address') address: string, @Query() query: TokenBalancesQueryDto) {
    return this.alchemyService.getTokenBalances(address, query.pageKey);
  }

  @Get(':address/token-transfers')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get all ERC-20 token transfers' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({ name: 'direction', enum: ['from', 'to'], required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pageKey', required: false })
  @ApiResponse({ status: 200 })
  async getTokenTransfers(@Param('address') address: string, @Query() query: ListQueryDto) {
    return this.alchemyService.getTokenTransfers(address, query.direction, query.limit, query.pageKey);
  }

  // ---------------------------------------------------------------------------
  // Cache (admin)
  // ---------------------------------------------------------------------------

  @Get('cache/stats')
  @RequireScopes(Scope.ADMIN)
  @ApiOperation({ summary: 'Cache statistics' })
  getCacheStats() {
    return this.alchemyService.getCacheStats();
  }

  @Post('cache/cleanup')
  @RequireScopes(Scope.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger cache cleanup' })
  async cleanupCache() {
    await this.alchemyService.cleanupCache();
    return { message: 'Cache cleanup completed' };
  }
}
