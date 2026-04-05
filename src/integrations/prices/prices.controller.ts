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
	@ApiResponse({
		status: 200,
		schema: {
			example: [
				{ from: 'WETH', to: 'USD', source: 'defillama', value: 3200.5, fetchedAt: '2026-04-05T10:00:00.000Z' },
				{ from: 'WETH', to: 'USD', source: 'oneinch', value: 3201.1, fetchedAt: '2026-04-05T10:00:00.000Z' },
				{ from: 'USDT', to: 'CHF', source: 'kraken', value: 0.9, fetchedAt: '2026-04-05T10:00:00.000Z' },
			],
		},
	})
	rates(@Query('from') from?: string) {
		return this.prices.getRates(from);
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
