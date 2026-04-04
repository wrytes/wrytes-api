import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { KrakenBalance } from './kraken.balance';
import { KrakenMarket } from './kraken.market';
import { KrakenOrders } from './kraken.orders';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';

@ApiTags('Kraken')
@Controller('kraken')
@UseGuards(ApiKeyGuard, ScopesGuard)
@ApiSecurity('api-key')
@RequireScopes('KRAKEN')
export class KrakenController {
  constructor(
    private readonly balance: KrakenBalance,
    private readonly market: KrakenMarket,
    private readonly orders: KrakenOrders,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: 'Account balance for all assets' })
  getBalance() {
    return this.balance.getBalance();
  }

  @Get('market/ticker')
  @ApiOperation({ summary: 'Ticker information for a trading pair' })
  @ApiQuery({ name: 'pair', description: 'Kraken pair string (e.g. USDT/CHF)', example: 'USDT/CHF' })
  getTicker(@Query('pair') pair: string) {
    return this.market.getTicker(pair);
  }

  @Get('market/price')
  @ApiOperation({ summary: 'Last-trade price for a token symbol' })
  @ApiQuery({ name: 'symbol', description: 'Token symbol (e.g. ZCHF, CHF)', example: 'ZCHF' })
  async getPrice(@Query('symbol') symbol: string) {
    const price = await this.market.getPrice(symbol);
    return { symbol, price };
  }

  @Get('market/symbols')
  @ApiOperation({ summary: 'List supported token symbols' })
  getSupportedSymbols() {
    return { symbols: this.market.getSupportedSymbols() };
  }

  @Get('orders/open')
  @ApiOperation({ summary: 'All currently open orders' })
  getOpenOrders() {
    return this.orders.getOpenOrders();
  }

  @Get('orders/info')
  @ApiOperation({ summary: 'Order details by transaction ID' })
  @ApiQuery({ name: 'txid', description: 'Kraken order txid', example: 'OWKHYJ-OL2BD-GKSSXH' })
  @ApiQuery({ name: 'trades', required: false, type: Boolean })
  getOrderInfo(@Query('txid') txid: string, @Query('trades') trades?: boolean) {
    return this.orders.getOrderInfo({ txid, trades });
  }

  @Get('withdraw/status')
  @ApiOperation({ summary: 'Recent withdrawal status' })
  @ApiQuery({ name: 'asset', required: false, example: 'USDT' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getWithdrawStatus(@Query('asset') asset?: string, @Query('limit') limit?: string) {
    return this.balance.withdrawStatus({ asset, limit: parseInt(limit ?? '10') });
  }
}
