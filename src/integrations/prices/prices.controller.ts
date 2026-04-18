import {
	Controller,
	Get,
	Param,
	Query,
	NotFoundException,
	UseGuards,
} from '@nestjs/common';
import {
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiSecurity,
	ApiTags,
} from '@nestjs/swagger';
import { PricesService } from './prices.service';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';

@ApiTags('Prices')
@Controller('prices')
@UseGuards(ScopesGuard)
@ApiSecurity('api-key')
@RequireScopes('USER')
export class PricesController {
	constructor(private readonly prices: PricesService) {}

	@Get()
	@ApiOperation({ summary: 'Current prices for all tracked tokens' })
	@ApiResponse({
		status: 200,
		schema: {
			example: {
				WETH: { symbol: 'WETH', usd: 3200.5, chf: 2880.1, eur: 2950.3, updatedAt: '2026-04-05T10:00:00.000Z' },
				USDT: { symbol: 'USDT', usd: 1.0, chf: 0.9, eur: 0.92, updatedAt: '2026-04-05T10:00:00.000Z' },
			},
		},
	})
	list() {
		return this.prices.getAllPrices();
	}

	@Get('rates')
	@ApiOperation({ summary: 'Raw exchange rates from all price sources' })
	@ApiQuery({ name: 'from', required: false, example: 'WETH', description: 'Filter by source token' })
	@ApiQuery({ name: 'to',   required: false, example: 'CHF',  description: 'Filter by target token' })
	@ApiResponse({
		status: 200,
		schema: {
			example: [
				{ from: 'WETH', to: 'USD', source: 'defillama', value: 3200.5, fetchedAt: '2026-04-05T10:00:00.000Z' },
				{ from: 'ETH',  to: 'CHF', source: 'kraken',    value: 2880.1, fetchedAt: '2026-04-05T10:00:00.000Z' },
			],
		},
	})
	rates(@Query('from') from?: string, @Query('to') to?: string) {
		return this.prices.getRates(from, to);
	}

	@Get('resolve')
	@ApiOperation({ summary: 'Shortest tradeable path between two tokens (BFS, trading venues only)' })
	@ApiQuery({ name: 'from', required: true, example: 'ZCHF' })
	@ApiQuery({ name: 'to',   required: true, example: 'CHF'  })
	@ApiResponse({
		status: 200,
		schema: {
			example: {
				from: 'ZCHF',
				to: 'CHF',
				rate: 0.9987,
				legs: [
					{ from: 'ZCHF', to: 'USDC', source: 'oneinch', via: [], protocols: ['UNISWAP_V3', 'CURVE'] },
					{ from: 'USDC', to: 'CHF',  source: 'kraken',  via: [] },
				],
			},
		},
	})
	resolve(@Query('from') from: string, @Query('to') to: string) {
		return this.prices.resolveRate(from, to);
	}

	@Get('routes')
	@ApiOperation({ summary: 'All tradeable paths between two tokens (DFS, trading venues only)' })
	@ApiQuery({ name: 'from', required: true, example: 'ZCHF' })
	@ApiQuery({ name: 'to',   required: true, example: 'CHF'  })
	@ApiResponse({
		status: 200,
		schema: {
			example: [
				{
					rate: 0.9987,
					legs: [
						{ from: 'ZCHF', to: 'USDC', source: 'oneinch', via: [], protocols: ['UNISWAP_V3', 'CURVE'] },
						{ from: 'USDC', to: 'CHF',  source: 'kraken',  via: [] },
					],
				},
			],
		},
	})
	routes(@Query('from') from: string, @Query('to') to: string) {
		return this.prices.findRoutes(from, to);
	}

	@Get(':symbol')
	@ApiOperation({ summary: 'Current price for a specific token symbol' })
	@ApiParam({ name: 'symbol', example: 'WETH' })
	@ApiResponse({
		status: 200,
		schema: {
			example: { symbol: 'WETH', usd: 3200.5, chf: 2880.1, eur: 2950.3, updatedAt: '2026-04-05T10:00:00.000Z' },
		},
	})
	@ApiResponse({ status: 404, description: 'No price data for symbol' })
	get(@Param('symbol') symbol: string) {
		const price = this.prices.getPrice(symbol);
		if (!price) throw new NotFoundException(`No price data for ${symbol.toUpperCase()}`);
		return price;
	}
}
