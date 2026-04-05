export type PriceSourceId = 'kraken' | 'defillama' | 'oneinch';
export type PriceCurrency = 'USD' | 'CHF' | 'EUR';

export interface Rate {
	from: string;
	to: string;
	/** 1 `from` = `value` `to` */
	value: number;
	source: PriceSourceId;
	fetchedAt: Date;
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
