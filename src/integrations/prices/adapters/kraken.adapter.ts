import { Injectable, Logger } from '@nestjs/common';
import { KRAKEN_PAIRS } from '../../../config/kraken.config';
import type { PriceAdapter, Rate } from '../prices.types';

interface KrakenTickerResponse {
  error: string[];
  result: Record<string, { c: [string, string] }>;
}

/**
 * Fetches live ticker prices from the Kraken public API.
 * No authentication required — uses /0/public/Ticker.
 * All configured KRAKEN_PAIRS are batched into a single request.
 */
@Injectable()
export class KrakenPriceAdapter implements PriceAdapter {
  readonly source = 'kraken' as const;
  private readonly logger = new Logger(KrakenPriceAdapter.name);

  async fetchRates(): Promise<Rate[]> {
    const uniquePairs = [...new Set(KRAKEN_PAIRS.map((p) => p.krakenPair))];
    this.logger.debug(`Requesting Kraken pairs: ${uniquePairs.join(', ')}`);

    const json = await this.fetchTicker(uniquePairs.join(','));

    if (json.error?.length) {
      this.logger.warn(`Batch request failed (${json.error.join(', ')}) — retrying pairs individually`);
      return this.fetchRatesIndividually();
    }

    return this.parseRates(json);
  }

  private async fetchRatesIndividually(): Promise<Rate[]> {
    const uniquePairs = [...new Set(KRAKEN_PAIRS.map((p) => p.krakenPair))];
    const results = new Map<string, KrakenTickerResponse>();

    await Promise.all(
      uniquePairs.map(async (pair) => {
        const json = await this.fetchTicker(pair);
        if (json.error?.length) {
          this.logger.warn(`Kraken pair ${pair} failed: ${json.error.join(', ')}`);
        } else {
          results.set(pair, json);
          this.logger.debug(`Kraken pair ${pair} OK`);
        }
      }),
    );

    // Merge all valid results into one response object for parseRates
    const merged: KrakenTickerResponse = { error: [], result: {} };
    for (const json of results.values()) {
      Object.assign(merged.result, json.result);
    }
    return this.parseRates(merged);
  }

  private async fetchTicker(pairs: string): Promise<KrakenTickerResponse> {
    try {
      const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pairs}`);
      return res.json();
    } catch (err) {
      this.logger.error(`Kraken fetch failed: ${err.message}`);
      return { error: [err.message], result: {} };
    }
  }

  private parseRates(json: KrakenTickerResponse): Rate[] {
    const fetchedAt = new Date();
    const rates: Rate[] = [];
    const seen = new Set<string>();

    for (const { from, to, krakenPair } of KRAKEN_PAIRS) {
      const key = `${from}/${to}`;
      if (seen.has(key)) continue;

      const ticker = json.result[krakenPair];
      if (!ticker) continue;

      const value = parseFloat(ticker.c[0]);
      if (!isFinite(value) || value <= 0) continue;

      rates.push({ from, to, value, source: 'kraken', fetchedAt });
      seen.add(key);
    }

    this.logger.debug(`Fetched ${rates.length} rates from Kraken`);
    return rates;
  }
}
