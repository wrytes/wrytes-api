import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { KrakenPriceAdapter } from './adapters/kraken.adapter';
import { DefiLlamaPriceAdapter } from './adapters/defillama.adapter';
import { OneInchPriceAdapter } from './adapters/oneinch.adapter';
import { RateGraph } from './prices.graph';
import { TOKEN_SLUGS, ETH_WETH_ALIAS, PEG_CONFIG } from '../../config/tokens.config';
import type { ResolvedPrice } from './prices.types';

const CURRENCIES = ['USD', 'CHF', 'EUR'] as const;
const SYMBOLS = Object.keys(TOKEN_SLUGS);

@Injectable()
export class PricesService implements OnModuleInit {
	private readonly logger = new Logger(PricesService.name);
	private cache = new Map<string, ResolvedPrice>();
	private graph = new RateGraph();

	constructor(
		private readonly prisma: PrismaService,
		private readonly kraken: KrakenPriceAdapter,
		private readonly defillama: DefiLlamaPriceAdapter,
		private readonly oneinch: OneInchPriceAdapter,
	) {}

	async onModuleInit() {
		await this.restoreFromDb();
		// Populate 1inch cache before the first price refresh so rates are available immediately
		await this.refreshOneInchRoutes();
		// Kick off a refresh immediately so prices are fresh on startup
		this.refresh().catch((err) =>
			this.logger.error(`Initial price refresh failed: ${err.message}`),
		);
	}

	// ---------------------------------------------------------------------------
	// Cron: purge stale rates every hour (no update in 10 days = orphaned)
	// ---------------------------------------------------------------------------

	@Cron('0 * * * *')
	async purgeStaleRates(): Promise<void> {
		const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
		const { count } = await this.prisma.priceRate.deleteMany({
			where: { fetchedAt: { lt: cutoff } },
		});
		if (count > 0) this.logger.log(`Purged ${count} stale price rate(s) older than 10 days`);
	}

	// ---------------------------------------------------------------------------
	// Cron: refresh 1inch routes every hour (route discovery is expensive)
	// ---------------------------------------------------------------------------

	@Cron('0 * * * *')
	async refreshOneInchRoutes(): Promise<void> {
		await this.oneinch.refreshRoutes().catch((err) =>
			this.logger.error(`1inch route refresh failed: ${err.message}`),
		);
	}

	// ---------------------------------------------------------------------------
	// Cron: refresh prices every 10 minutes (uses cached 1inch routes)
	// ---------------------------------------------------------------------------

	@Cron('*/10 * * * *')
	async refresh(): Promise<void> {
		const graph = new RateGraph();
		this.graph = graph;

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
						rate.protocols,
					);
				}
			} else {
				this.logger.warn(
					`Price adapter failed: ${result.reason?.message}`,
				);
			}
		}

		// ETH and WETH are economically identical — inject a synthetic 1:1 bridge
		// so the graph can resolve either symbol regardless of which source priced which.
		graph.add(ETH_WETH_ALIAS.from, ETH_WETH_ALIAS.to, ETH_WETH_ALIAS.value, 'defillama', new Date());

		// For each pegged asset, resolve the live asset/peg rate from the graph and persist
		// it as a derived edge so callers can observe the current peg deviation directly.
		const derivedAt = new Date();
		for (const { asset, peg } of PEG_CONFIG) {
			const rate = graph.resolve(asset, peg);
			if (rate !== null) graph.add(asset, peg, rate, 'derived', derivedAt);
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

	getRates(from?: string, to?: string) {
		const expand = (symbol: string) => {
			const s = symbol.toUpperCase();
			return ETH_WETH_ALIAS.from === s || ETH_WETH_ALIAS.to === s
				? [ETH_WETH_ALIAS.from, ETH_WETH_ALIAS.to]
				: [s];
		};

		const fromSymbols = from ? expand(from) : undefined;
		const toSymbols   = to   ? expand(to)   : undefined;

		return this.prisma.priceRate.findMany({
			where: {
				...(fromSymbols ? { from: { in: fromSymbols } } : {}),
				...(toSymbols   ? { to:   { in: toSymbols   } } : {}),
			},
			orderBy: [{ from: 'asc' }, { to: 'asc' }, { source: 'asc' }],
		});
	}

	resolveRate(from: string, to: string) {
		const f = from.toUpperCase();
		const t = to.toUpperCase();
		const result = this.graph.resolveWithPath(f, t);
		return { from: f, to: t, rate: result?.rate ?? null, legs: result?.legs ?? null };
	}

	findRoutes(from: string, to: string) {
		const f = from.toUpperCase();
		const t = to.toUpperCase();
		return this.graph.findAllRoutes(f, t);
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
