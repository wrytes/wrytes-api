import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Currency, MarketGetDeliveryPricesNames, OrderType, TimeInForce } from '@wrytes/deribit-api-client';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
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
  getAccountSummaries() {
    return this.account.getAccountSummaries();
  }

  @Get('account/summary')
  @ApiOperation({ summary: 'Account summary for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  getAccountSummary(@Query('currency') currency: Currency) {
    return this.account.getAccountSummary(currency);
  }

  @Get('account/position')
  @ApiOperation({ summary: 'Position for a specific instrument' })
  @ApiQuery({ name: 'instrument', example: 'BTC-PERPETUAL' })
  getPosition(@Query('instrument') instrument: string) {
    return this.account.getPosition(instrument);
  }

  @Get('account/portfolio-margins')
  @ApiOperation({ summary: 'Portfolio margin data for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  getPortfolioMargins(@Query('currency') currency: Currency) {
    return this.account.getPortfolioMargins(currency);
  }

  @Get('account/transaction-log')
  @ApiOperation({ summary: 'Transaction log for a currency and time range' })
  @ApiQuery({ name: 'currency', enum: Currency })
  @ApiQuery({ name: 'start', type: Number, description: 'Start timestamp (ms)' })
  @ApiQuery({ name: 'end', type: Number, description: 'End timestamp (ms)' })
  @ApiQuery({ name: 'count', required: false, type: Number })
  getTransactionLog(
    @Query('currency') currency: Currency,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('count') count?: string,
  ) {
    return this.account.getTransactionLog(
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
  getCurrencies() {
    return this.market.getCurrencies();
  }

  @Get('market/index-price')
  @ApiOperation({ summary: 'Current index price' })
  @ApiQuery({ name: 'index', example: 'btc_usd' })
  getIndexPrice(@Query('index') index: string) {
    return this.market.getIndexPrice(index);
  }

  @Get('market/instruments')
  @ApiOperation({ summary: 'Available instruments for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  @ApiQuery({ name: 'kind', required: false, enum: ['future', 'option', 'spot', 'future_combo', 'option_combo'] })
  @ApiQuery({ name: 'expired', required: false, type: Boolean })
  getInstruments(
    @Query('currency') currency: Currency,
    @Query('kind') kind?: 'future' | 'option' | 'spot' | 'future_combo' | 'option_combo',
    @Query('expired') expired?: boolean,
  ) {
    return this.market.getInstruments(currency, kind, expired);
  }

  @Get('market/book-summary/currency')
  @ApiOperation({ summary: 'Order book summary by currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  getBookSummaryByCurrency(@Query('currency') currency: Currency) {
    return this.market.getBookSummaryByCurrency(currency);
  }

  @Get('market/book-summary/instrument')
  @ApiOperation({ summary: 'Order book summary for a specific instrument' })
  @ApiQuery({ name: 'instrument', example: 'BTC-PERPETUAL' })
  getBookSummaryByInstrument(@Query('instrument') instrument: string) {
    return this.market.getBookSummaryByInstrument(instrument);
  }

  @Get('market/delivery-prices')
  @ApiOperation({ summary: 'Delivery prices for an index' })
  @ApiQuery({ name: 'index', enum: MarketGetDeliveryPricesNames })
  getDeliveryPrices(@Query('index') index: MarketGetDeliveryPricesNames) {
    return this.market.getDeliveryPrices(index);
  }

  @Get('market/volatility')
  @ApiOperation({ summary: 'Volatility index data for a currency and time range' })
  @ApiQuery({ name: 'currency', example: 'BTC' })
  @ApiQuery({ name: 'start', type: Number, description: 'Start timestamp (ms)' })
  @ApiQuery({ name: 'end', type: Number, description: 'End timestamp (ms)' })
  @ApiQuery({ name: 'resolution', example: '3600', description: 'Bucket size in seconds' })
  getVolatilityIndexData(
    @Query('currency') currency: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('resolution') resolution: string,
  ) {
    return this.market.getVolatilityIndexData(currency, parseInt(start), parseInt(end), resolution);
  }

  // ---------------------------------------------------------------------------
  // Trading
  // ---------------------------------------------------------------------------

  @Get('trading/orders/open')
  @ApiOperation({ summary: 'All open orders for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  getOpenOrdersByCurrency(@Query('currency') currency: Currency) {
    return this.trading.getOpenOrdersByCurrency(currency);
  }

  @Get('trading/orders/open/instrument')
  @ApiOperation({ summary: 'Open orders for a specific instrument' })
  @ApiQuery({ name: 'instrument', example: 'BTC-PERPETUAL' })
  getOpenOrdersByInstrument(@Query('instrument') instrument: string) {
    return this.trading.getOpenOrdersByInstrument(instrument);
  }

  @Get('trading/orders/state')
  @ApiOperation({ summary: 'State of an order by ID' })
  @ApiQuery({ name: 'order_id', example: 'ETH-123456' })
  getOrderState(@Query('order_id') order_id: string) {
    return this.trading.getOrderState(order_id);
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
  buy(@Body() params: PlaceOrderParams) {
    return this.trading.buy(params);
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
  sell(@Body() params: PlaceOrderParams) {
    return this.trading.sell(params);
  }

  @Post('trading/cancel')
  @ApiOperation({ summary: 'Cancel an order by ID' })
  @ApiBody({ schema: { properties: { order_id: { type: 'string' } }, required: ['order_id'] } })
  cancel(@Body('order_id') order_id: string) {
    return this.trading.cancel(order_id);
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
    @Query('currency') currency: Currency,
    @Query('count') count?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wallet.getDeposits(
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
    @Query('currency') currency: Currency,
    @Query('count') count?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wallet.getWithdrawals(
      currency,
      count ? parseInt(count) : undefined,
      offset ? parseInt(offset) : undefined,
    );
  }

  @Get('wallet/deposit-address')
  @ApiOperation({ summary: 'Current deposit address for a currency' })
  @ApiQuery({ name: 'currency', enum: Currency })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCurrentDepositAddress(@Query('currency') currency: Currency): Promise<any> {
    return this.wallet.getCurrentDepositAddress(currency);
  }

  @Post('wallet/deposit-address')
  @ApiOperation({ summary: 'Create a new deposit address for a currency' })
  @ApiBody({ schema: { properties: { currency: { type: 'string', enum: Object.values(Currency) } }, required: ['currency'] } })
  createDepositAddress(@Body('currency') currency: Currency) {
    return this.wallet.createDepositAddress(currency);
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
  withdraw(@Body() params: { currency: Currency; address: string; amount: number; priority?: any }) {
    return this.wallet.withdraw(params);
  }
}
