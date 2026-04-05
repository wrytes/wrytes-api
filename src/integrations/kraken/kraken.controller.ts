import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { KrakenBalance } from './kraken.balance';
import { KrakenWithdraw } from './kraken.withdraw';
import { KrakenDeposit } from './kraken.deposit';
import { KrakenMarket } from './kraken.market';
import { KrakenOrders } from './kraken.orders';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Kraken')
@Controller('kraken')
@UseGuards(ScopesGuard)
@ApiSecurity('api-key')
@RequireScopes('KRAKEN')
export class KrakenController {
	constructor(
		private readonly balance: KrakenBalance,
		private readonly withdraw: KrakenWithdraw,
		private readonly deposit: KrakenDeposit,
		private readonly market: KrakenMarket,
		private readonly orders: KrakenOrders,
	) {}

	// ---------------------------------------------------------------------------
	// Balance
	// ---------------------------------------------------------------------------

	@Get('balance')
	@ApiOperation({ summary: 'Account balance for all assets' })
	getBalance(@CurrentUser() user: User) {
		return this.balance.getBalance(user.id);
	}

	// ---------------------------------------------------------------------------
	// Market
	// ---------------------------------------------------------------------------

	@Get('market/ticker')
	@ApiOperation({ summary: 'Ticker information for a trading pair' })
	@ApiQuery({ name: 'pair', example: 'USDT/CHF' })
	getTicker(@CurrentUser() user: User, @Query('pair') pair: string) {
		return this.market.getTicker(user.id, pair);
	}

	@Get('market/price')
	@ApiOperation({ summary: 'Last-trade price for a token symbol' })
	@ApiQuery({ name: 'symbol', example: 'CHF' })
	async getPrice(@CurrentUser() user: User, @Query('symbol') symbol: string) {
		const price = await this.market.getPrice(user.id, symbol);
		return { symbol, price };
	}

	// ---------------------------------------------------------------------------
	// Orders
	// ---------------------------------------------------------------------------

	@Get('orders/open')
	@ApiOperation({ summary: 'All currently open orders' })
	getOpenOrders(@CurrentUser() user: User) {
		return this.orders.getOpenOrders(user.id);
	}

	@Get('orders/info')
	@ApiOperation({ summary: 'Order details by transaction ID' })
	@ApiQuery({ name: 'txid', example: 'OWKHYJ-OL2BD-GKSSXH' })
	@ApiQuery({ name: 'trades', required: false, type: Boolean })
	getOrderInfo(
		@CurrentUser() user: User,
		@Query('txid') txid: string,
		@Query('trades') trades?: boolean,
	) {
		return this.orders.getOrderInfo(user.id, { txid, trades });
	}

	// ---------------------------------------------------------------------------
	// Withdraw
	// ---------------------------------------------------------------------------

	@Get('withdraw/status')
	@ApiOperation({ summary: 'Recent withdrawal status' })
	@ApiQuery({ name: 'asset', required: false, example: 'USDT' })
	@ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
	getWithdrawStatus(
		@CurrentUser() user: User,
		@Query('asset') asset?: string,
		@Query('limit') limit?: string,
	) {
		return this.withdraw.withdrawStatus(user.id, {
			asset,
			limit: parseInt(limit ?? '10'),
		});
	}

	// ---------------------------------------------------------------------------
	// Deposit
	// ---------------------------------------------------------------------------

	@Get('deposit/methods')
	@ApiOperation({ summary: 'Available deposit methods for an asset' })
	@ApiQuery({ name: 'asset', example: 'USDT' })
	getDepositMethods(@CurrentUser() user: User, @Query('asset') asset: string) {
		return this.deposit.getMethods(user.id, { asset });
	}

	@Get('deposit/addresses')
	@ApiOperation({ summary: 'Deposit addresses for an asset and method' })
	@ApiQuery({ name: 'asset', example: 'USDT' })
	@ApiQuery({ name: 'method', example: 'Tether USD (ERC20)' })
	@ApiQuery({
		name: 'new',
		required: false,
		type: Boolean,
		description: 'Generate a new address',
	})
	getDepositAddresses(
		@CurrentUser() user: User,
		@Query('asset') asset: string,
		@Query('method') method: string,
		@Query('new') newAddress?: boolean,
	) {
		return this.deposit.getAddresses(user.id, { asset, method, new: newAddress });
	}

	@Get('deposit/status')
	@ApiOperation({ summary: 'Recent deposit status' })
	@ApiQuery({ name: 'asset', required: false, example: 'USDT' })
	@ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
	getDepositStatus(
		@CurrentUser() user: User,
		@Query('asset') asset?: string,
		@Query('limit') limit?: string,
	) {
		return this.deposit.getStatus(user.id, {
			asset,
			limit: parseInt(limit ?? '10'),
		});
	}
}
