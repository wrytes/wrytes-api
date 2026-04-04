import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Currency, MarketGetDeliveryPricesNames, OrderType, TimeInForce } from '@wrytes/deribit-api-client';
import type { User } from '@prisma/client';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeribitAccount } from './deribit.account';
import { DeribitMarket } from './deribit.market';
import { DeribitTrading } from './deribit.trading';
import type { PlaceOrderParams } from './deribit.trading';
import { DeribitWallet } from './deribit.wallet';

@ApiTags('Deribit')
@Controller('deribit')
@UseGuards(ApiKeyGuard, ScopesGuard)
@ApiSecurity('api-key')
@RequireScopes('DERIBIT')
export class DeribitController {
  constructor(
    private readonly account: DeribitAccount,
    private readonly market: DeribitMarket,
    private readonly trading: DeribitTrading,
    private readonly wallet: DeribitWallet,
  ) {}

  // ---------------------------------------------------------------------------
  // Account
  // ---------------------------------------------------------------------------

  @Get('account/summaries')
  @ApiOperation({ summary: 'Account summaries for all sub-accounts' })
  getAccountSummaries(@CurrentUser() user: User) {
    return this.account.getAccountSummaries(user.id);
  }

  @Get('account/summary')
  @ApiOperation({ summary: 'Account summary for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  getAccountSummary(@CurrentUser() user: User, @Query('currency') currency: Currency) {
    return this.account.getAccountSummary(user.id, currency);
  }

  @Get('account/position')
  @ApiOperation({ summary: 'Position for a specific instrument' })
  @ApiQuery({ name: 'instrument', example: 'BTC-PERPETUAL' })
  getPosition(@CurrentUser() user: User, @Query('instrument') instrument: string) {
    return this.account.getPosition(user.id, instrument);
  }

  @Get('account/portfolio-margins')
  @ApiOperation({ summary: 'Portfolio margin data for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  getPortfolioMargins(@CurrentUser() user: User, @Query('currency') currency: Currency) {
    return this.account.getPortfolioMargins(user.id, currency);
  }

  @Get('account/transaction-log')
  @ApiOperation({ summary: 'Transaction log for a currency and time range' })
  @ApiQuery({ name: 'currency', enum: Currency })
  @ApiQuery({ name: 'start', type: Number, description: 'Start timestamp (ms)' })
  @ApiQuery({ name: 'end', type: Number, description: 'End timestamp (ms)' })
  @ApiQuery({ name: 'count', required: false, type: Number })
  getTransactionLog(
    @CurrentUser() user: User,
    @Query('currency') currency: Currency,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('count') count?: string,
  ) {
    return this.account.getTransactionLog(
      user.id,
      currency,
      parseInt(start),
      parseInt(end),
      count ? parseInt(count) : undefined,
    );
  }

  // ---------------------------------------------------------------------------
  // Market
  // ---------------------------------------------------------------------------

  @Get('market/currencies')
  @ApiOperation({ summary: 'List all supported currencies' })
  getCurrencies(@CurrentUser() user: User) {
    return this.market.getCurrencies(user.id);
  }

  @Get('market/index-price')
  @ApiOperation({ summary: 'Current index price' })
  @ApiQuery({ name: 'index', example: 'btc_usd' })
  getIndexPrice(@CurrentUser() user: User, @Query('index') index: string) {
    return this.market.getIndexPrice(user.id, index);
  }

  @Get('market/instruments')
  @ApiOperation({ summary: 'Available instruments for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  @ApiQuery({ name: 'kind', required: false, enum: ['future', 'option', 'spot', 'future_combo', 'option_combo'] })
  @ApiQuery({ name: 'expired', required: false, type: Boolean })
  getInstruments(
    @CurrentUser() user: User,
    @Query('currency') currency: Currency,
    @Query('kind') kind?: 'future' | 'option' | 'spot' | 'future_combo' | 'option_combo',
    @Query('expired') expired?: boolean,
  ) {
    return this.market.getInstruments(user.id, currency, kind, expired);
  }

  @Get('market/book-summary/currency')
  @ApiOperation({ summary: 'Order book summary by currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  getBookSummaryByCurrency(@CurrentUser() user: User, @Query('currency') currency: Currency) {
    return this.market.getBookSummaryByCurrency(user.id, currency);
  }

  @Get('market/book-summary/instrument')
  @ApiOperation({ summary: 'Order book summary for a specific instrument' })
  @ApiQuery({ name: 'instrument', example: 'BTC-PERPETUAL' })
  getBookSummaryByInstrument(@CurrentUser() user: User, @Query('instrument') instrument: string) {
    return this.market.getBookSummaryByInstrument(user.id, instrument);
  }

  @Get('market/delivery-prices')
  @ApiOperation({ summary: 'Delivery prices for an index' })
  @ApiQuery({ name: 'index', enum: MarketGetDeliveryPricesNames })
  getDeliveryPrices(@CurrentUser() user: User, @Query('index') index: MarketGetDeliveryPricesNames) {
    return this.market.getDeliveryPrices(user.id, index);
  }

  @Get('market/volatility')
  @ApiOperation({ summary: 'Volatility index data for a currency and time range' })
  @ApiQuery({ name: 'currency', example: 'BTC' })
  @ApiQuery({ name: 'start', type: Number, description: 'Start timestamp (ms)' })
  @ApiQuery({ name: 'end', type: Number, description: 'End timestamp (ms)' })
  @ApiQuery({ name: 'resolution', example: '3600', description: 'Bucket size in seconds' })
  getVolatilityIndexData(
    @CurrentUser() user: User,
    @Query('currency') currency: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('resolution') resolution: string,
  ) {
    return this.market.getVolatilityIndexData(user.id, currency, parseInt(start), parseInt(end), resolution);
  }

  // ---------------------------------------------------------------------------
  // Trading
  // ---------------------------------------------------------------------------

  @Get('trading/orders/open')
  @ApiOperation({ summary: 'All open orders for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  getOpenOrdersByCurrency(@CurrentUser() user: User, @Query('currency') currency: Currency) {
    return this.trading.getOpenOrdersByCurrency(user.id, currency);
  }

  @Get('trading/orders/open/instrument')
  @ApiOperation({ summary: 'Open orders for a specific instrument' })
  @ApiQuery({ name: 'instrument', example: 'BTC-PERPETUAL' })
  getOpenOrdersByInstrument(@CurrentUser() user: User, @Query('instrument') instrument: string) {
    return this.trading.getOpenOrdersByInstrument(user.id, instrument);
  }

  @Get('trading/orders/state')
  @ApiOperation({ summary: 'State of an order by ID' })
  @ApiQuery({ name: 'order_id', example: 'ETH-123456' })
  getOrderState(@CurrentUser() user: User, @Query('order_id') order_id: string) {
    return this.trading.getOrderState(user.id, order_id);
  }

  @Post('trading/buy')
  @ApiOperation({ summary: 'Place a buy order' })
  @ApiBody({
    schema: {
      properties: {
        instrument_name: { type: 'string', example: 'BTC-PERPETUAL' },
        amount: { type: 'number', example: 10 },
        type: { type: 'string', enum: Object.values(OrderType), example: OrderType.limit },
        price: { type: 'number', example: 50000 },
        time_in_force: { type: 'string', enum: Object.values(TimeInForce) },
        reduce_only: { type: 'boolean' },
        post_only: { type: 'boolean' },
      },
      required: ['instrument_name', 'amount', 'type'],
    },
  })
  buy(@CurrentUser() user: User, @Body() params: PlaceOrderParams) {
    return this.trading.buy(user.id, params);
  }

  @Post('trading/sell')
  @ApiOperation({ summary: 'Place a sell order' })
  @ApiBody({
    schema: {
      properties: {
        instrument_name: { type: 'string', example: 'BTC-PERPETUAL' },
        amount: { type: 'number', example: 10 },
        type: { type: 'string', enum: Object.values(OrderType), example: OrderType.limit },
        price: { type: 'number', example: 50000 },
        time_in_force: { type: 'string', enum: Object.values(TimeInForce) },
        reduce_only: { type: 'boolean' },
        post_only: { type: 'boolean' },
      },
      required: ['instrument_name', 'amount', 'type'],
    },
  })
  sell(@CurrentUser() user: User, @Body() params: PlaceOrderParams) {
    return this.trading.sell(user.id, params);
  }

  @Post('trading/cancel')
  @ApiOperation({ summary: 'Cancel an order by ID' })
  @ApiBody({ schema: { properties: { order_id: { type: 'string' } }, required: ['order_id'] } })
  cancel(@CurrentUser() user: User, @Body('order_id') order_id: string) {
    return this.trading.cancel(user.id, order_id);
  }

  // ---------------------------------------------------------------------------
  // Wallet
  // ---------------------------------------------------------------------------

  @Get('wallet/deposits')
  @ApiOperation({ summary: 'Deposit history for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  @ApiQuery({ name: 'count', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getDeposits(
    @CurrentUser() user: User,
    @Query('currency') currency: Currency,
    @Query('count') count?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wallet.getDeposits(
      user.id,
      currency,
      count ? parseInt(count) : undefined,
      offset ? parseInt(offset) : undefined,
    );
  }

  @Get('wallet/withdrawals')
  @ApiOperation({ summary: 'Withdrawal history for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  @ApiQuery({ name: 'count', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getWithdrawals(
    @CurrentUser() user: User,
    @Query('currency') currency: Currency,
    @Query('count') count?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wallet.getWithdrawals(
      user.id,
      currency,
      count ? parseInt(count) : undefined,
      offset ? parseInt(offset) : undefined,
    );
  }

  @Get('wallet/deposit-address')
  @ApiOperation({ summary: 'Current deposit address for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCurrentDepositAddress(@CurrentUser() user: User, @Query('currency') currency: Currency): Promise<any> {
    return this.wallet.getCurrentDepositAddress(user.id, currency);
  }

  @Post('wallet/deposit-address')
  @ApiOperation({ summary: 'Create a new deposit address for a currency' })
  @ApiBody({ schema: { properties: { currency: { type: 'string', enum: Object.values(Currency) } }, required: ['currency'] } })
  createDepositAddress(@CurrentUser() user: User, @Body('currency') currency: Currency) {
    return this.wallet.createDepositAddress(user.id, currency);
  }

  @Post('wallet/withdraw')
  @ApiOperation({ summary: 'Withdraw funds' })
  @ApiBody({
    schema: {
      properties: {
        currency: { type: 'string', enum: Object.values(Currency) },
        address: { type: 'string' },
        amount: { type: 'number' },
        priority: { type: 'string' },
      },
      required: ['currency', 'address', 'amount'],
    },
  })
  withdraw(@CurrentUser() user: User, @Body() params: { currency: Currency; address: string; amount: number; priority?: any }) {
    return this.wallet.withdraw(user.id, params);
  }
}
