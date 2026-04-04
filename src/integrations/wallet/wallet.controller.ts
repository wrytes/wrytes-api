import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { WalletBalance } from './wallet.balance';
import { WalletService } from './wallet.service';
import { WalletTokenList } from './wallet.tokens';
import { ChainId } from './wallet.types';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(ApiKeyGuard, ScopesGuard)
@ApiSecurity('api-key')
@RequireScopes('WALLET')
export class WalletController {
  constructor(
    private readonly balance: WalletBalance,
    private readonly wallet: WalletService,
    private readonly tokenList: WalletTokenList,
  ) {}

  @Get('address')
  @ApiOperation({ summary: 'Get wallet address' })
  getAddress() {
    return { address: this.wallet.address };
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get native and token balances across supported chains' })
  @ApiQuery({ name: 'chainId', required: false, description: 'Filter by chain ID' })
  async getBalance(@Query('chainId') chainId?: string) {
    const chains = chainId ? [parseInt(chainId) as ChainId] : undefined;
    return this.balance.getBalance(chains);
  }

  @Get('tokens')
  @ApiOperation({ summary: 'List tracked tokens' })
  @ApiQuery({ name: 'chainId', required: false })
  getTokens(@Query('chainId') chainId?: string) {
    if (chainId) {
      const id = parseInt(chainId) as ChainId;
      return { chainId: id, tokens: this.tokenList.getTokensByChain(id) };
    }
    return { tokens: this.tokenList.getAllTokens() };
  }
}
