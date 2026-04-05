import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { KrakenPriceAdapter } from './adapters/kraken.adapter';
import { DefiLlamaPriceAdapter } from './adapters/defillama.adapter';
import { OneInchPriceAdapter } from './adapters/oneinch.adapter';
import { RateGraph } from './prices.graph';
import { TOKEN_SLUGS } from './prices.slugs';
import type { ResolvedPrice } from './prices.types';

const CURRENCIES = ['USD', 'CHF', 'EUR'] as const;
const SYMBOLS = Object.keys(TOKEN_SLUGS);

@Injectable()
export class PricesService implements OnModuleInit {
	private readonly logger = new Logger(PricesService.name);
	private cache = new Map<string, ResolvedPrice>();

	constructor(
		private readonly prisma: PrismaService,
		private readonly kraken: KrakenPriceAdapter,
		private readonly defillama: DefiLlamaPriceAdapter,
		private readonly oneinch: OneInchPriceAdapter,
	) {}

	async onModuleInit() {
		await this.restoreFromDb();
		// Kick off a refresh immediately so prices are fresh on startup
		this.refresh().catch((err) =>
			this.logger.error(`Initial price refresh failed: ${err.message}`),
		);
	}

	// ---------------------------------------------------------------------------
	// Cron: refresh every 10 minutes
	// ---------------------------------------------------------------------------

	@Cron('*/10 * * * *')
	async refresh(): Promise<void> {
		const graph = new RateGraph();

		const results = await Promise.allSettled([
			this.kraken.fetchRates(),
			this.defillama.fetchRates(),
			this.oneinch.fetchRates(),
		]);

		for (const result of results) {
			if (result.status === 'fulfilled') {
				for (const rate of result.value) {
					graph.add(
						rate.from,
						rate.to,
						rate.value,
						rate.source,
						rate.fetchedAt,
					);
				}
			} else {
				this.logger.warn(
					`Price adapter failed: ${result.reason?.message}`,
				);
			}
		}

		const updatedAt = new Date();
		const resolved = new Map<string, ResolvedPrice>();

		for (const symbol of SYMBOLS) {
			resolved.set(symbol, {
				symbol,
				usd: graph.resolve(symbol, 'USD'),
				chf: graph.resolve(symbol, 'CHF'),
				eur: graph.resolve(symbol, 'EUR'),
				updatedAt,
			});
		}

		this.cache = resolved;

		await this.persistToDb(graph, resolved).catch((err) =>
			this.logger.error(`Failed to persist prices: ${err.message}`),
		);

		this.logger.log(
			`Prices refreshed — ${resolved.size} symbols, ${graph.getAllRates().length / 2} rates`,
		);
	}

	// ---------------------------------------------------------------------------
	// Public API
	// ---------------------------------------------------------------------------

	getPrice(symbol: string): ResolvedPrice | null {
		return this.cache.get(symbol.toUpperCase()) ?? null;
	}

	getAllPrices(): Record<string, ResolvedPrice> {
		return Object.fromEntries(this.cache);
	}

	getRates(from?: string) {
		return this.prisma.priceRate.findMany({
			where: from ? { from: from.toUpperCase() } : undefined,
			orderBy: [{ from: 'asc' }, { source: 'asc' }],
		});
	}

	// ---------------------------------------------------------------------------
	// Persistence
	// ---------------------------------------------------------------------------

	private async persistToDb(
		graph: RateGraph,
		resolved: Map<string, ResolvedPrice>,
	): Promise<void> {
		const rateUpserts = graph
			.getAllRates()
			// Only store forward rates (skip inverses — we can reconstruct them)
			.filter(
				(r) =>
					!CURRENCIES.includes(r.from as any) ||
					!SYMBOLS.includes(r.to),
			)
			.map((r) =>
				this.prisma.priceRate.upsert({
					where: {
						from_to_source: {
							from: r.from,
							to: r.to,
							source: r.source,
						},
					},
					create: {
						from: r.from,
						to: r.to,
						source: r.source,
						value: r.value,
						fetchedAt: r.fetchedAt,
					},
					update: { value: r.value, fetchedAt: r.fetchedAt },
				}),
			);

		const cacheUpserts = [...resolved.values()].map((p) =>
			this.prisma.priceCache.upsert({
				where: { symbol: p.symbol },
				create: {
					symbol: p.symbol,
					usdPrice: p.usd,
					chfPrice: p.chf,
					eurPrice: p.eur,
				},
				update: { usdPrice: p.usd, chfPrice: p.chf, eurPrice: p.eur },
			}),
		);

		await this.prisma.$transaction([...rateUpserts, ...cacheUpserts]);
	}

	private async restoreFromDb(): Promise<void> {
		const cached = await this.prisma.priceCache.findMany();
		if (!cached.length) return;

		const restored = new Map<string, ResolvedPrice>();
		for (const row of cached) {
			restored.set(row.symbol, {
				symbol: row.symbol,
				usd: row.usdPrice,
				chf: row.chfPrice,
				eur: row.eurPrice,
				updatedAt: row.updatedAt,
			});
		}

		this.cache = restored;
		this.logger.log(`Restored ${restored.size} prices from DB`);
	}
}
