export type PriceSourceId = 'kraken' | 'defillama' | 'oneinch' | 'derived';

/** Sources that represent actual trading venues — used for route/path resolution. */
export const ROUTING_SOURCES: PriceSourceId[] = ['oneinch', 'kraken'];
export type PriceCurrency = 'USD' | 'CHF' | 'EUR';

export interface Rate {
	from: string;
	to: string;
	/** 1 `from` = `value` `to` */
	value: number;
	source: PriceSourceId;
	fetchedAt: Date;
	/** DEX protocols used internally (1inch only) */
	protocols?: string[];
}

export interface ResolvedPrice {
	symbol: string;
	usd: number | null;
	chf: number | null;
	eur: number | null;
	updatedAt: Date;
}

export interface PriceAdapter {
	readonly source: PriceSourceId;
	fetchRates(): Promise<Rate[]>;
}
