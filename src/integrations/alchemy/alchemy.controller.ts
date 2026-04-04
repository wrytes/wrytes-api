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
@Controller('chains/:chain/account')
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
  @ApiParam({ name: 'chain', description: 'Alchemy network slug (e.g. eth-mainnet, base-mainnet)' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  async getBalance(@Param('chain') chain: string, @Param('address') address: string) {
    const balance = await this.alchemyService.getBalance(chain, address);
    return { chain, address, balance };
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  @Get(':address/transactions')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get external transactions' })
  @ApiParam({ name: 'chain', description: 'Alchemy network slug' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({ name: 'direction', enum: ['from', 'to'], required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pageKey', required: false })
  async getTransactions(@Param('chain') chain: string, @Param('address') address: string, @Query() query: ListQueryDto) {
    return this.alchemyService.getTransactions(chain, address, query.direction ?? 'from', query.limit ?? 50, query.pageKey);
  }

  @Get(':address/internal-transactions')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get internal transactions' })
  @ApiParam({ name: 'chain', description: 'Alchemy network slug' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({ name: 'direction', enum: ['from', 'to'], required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pageKey', required: false })
  async getInternalTransactions(@Param('chain') chain: string, @Param('address') address: string, @Query() query: ListQueryDto) {
    return this.alchemyService.getInternalTransactions(chain, address, query.direction ?? 'from', query.limit ?? 50, query.pageKey);
  }

  // ---------------------------------------------------------------------------
  // Token (contract-scoped)
  // ---------------------------------------------------------------------------

  @Get(':address/token/:contract/transfers')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get ERC-20 transfers for a specific token' })
  @ApiParam({ name: 'chain', description: 'Alchemy network slug' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiParam({ name: 'contract', description: 'ERC-20 contract address' })
  @ApiQuery({ name: 'direction', enum: ['from', 'to'], required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pageKey', required: false })
  async getContractTokenTransfers(
    @Param('chain') chain: string,
    @Param('address') address: string,
    @Param('contract') contract: string,
    @Query() query: ListQueryDto,
  ) {
    return this.alchemyService.getContractTokenTransfers(chain, address, contract, query.direction ?? 'from', query.limit ?? 50, query.pageKey);
  }

  @Get(':address/token/:contract/balance')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get ERC-20 balance for a specific token' })
  @ApiParam({ name: 'chain', description: 'Alchemy network slug' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiParam({ name: 'contract', description: 'ERC-20 contract address' })
  async getTokenBalance(
    @Param('chain') chain: string,
    @Param('address') address: string,
    @Param('contract') contract: string,
  ) {
    return this.alchemyService.getTokenBalance(chain, address, contract);
  }

  // ---------------------------------------------------------------------------
  // Token (address-scoped)
  // ---------------------------------------------------------------------------

  @Get(':address/token-balances')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get all ERC-20 token balances' })
  @ApiParam({ name: 'chain', description: 'Alchemy network slug' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({ name: 'pageKey', required: false })
  async getTokenBalances(@Param('chain') chain: string, @Param('address') address: string, @Query() query: TokenBalancesQueryDto) {
    return this.alchemyService.getTokenBalances(chain, address, query.pageKey);
  }

  @Get(':address/token-transfers')
  @RequireScopes(Scope.READ)
  @ApiOperation({ summary: 'Get all ERC-20 token transfers' })
  @ApiParam({ name: 'chain', description: 'Alchemy network slug' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({ name: 'direction', enum: ['from', 'to'], required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pageKey', required: false })
  async getTokenTransfers(@Param('chain') chain: string, @Param('address') address: string, @Query() query: ListQueryDto) {
    return this.alchemyService.getTokenTransfers(chain, address, query.direction ?? 'from', query.limit ?? 50, query.pageKey);
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
