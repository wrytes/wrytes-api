import { Injectable, Logger } from '@nestjs/common';
import { KrakenClient } from './kraken.client';
import { TickerInformation } from './kraken.types';

const PRICE_CACHE_TTL_MS = 30_000;

interface PriceCache {
  price: number;
  bid: number;
  ask: number;
  ts: number;
}

@Injectable()
export class KrakenMarket {
  private readonly logger = new Logger(KrakenMarket.name);
  private readonly cache = new Map<string, PriceCache>();

  constructor(
    private readonly client: KrakenClient,
  ) {}

  async getTicker(pair: string): Promise<TickerInformation> {
    const res = await this.client.request({ method: 'GET', path: '/0/public/Ticker', query: { pair } });
    return res.json() as Promise<TickerInformation>;
  }

  /** Get last-trade USD price for a token symbol. Results cached for 30s. */
  async getPrice(symbol: string): Promise<number | null> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.ts < PRICE_CACHE_TTL_MS) return cached.price;

    try {
      const ticker = await this.getTicker(symbol);

      if (ticker.error?.length) {
        this.logger.error(`Kraken ticker error for ${symbol}: ${ticker.error.join(', ')}`);
        return null;
      }

      const data = ticker.result[symbol];
      if (!data) {
        this.logger.error(`No ticker data for pair ${symbol}`);
        return null;
      }

      const price = parseFloat(data.c[0]);
      const bid = parseFloat(data.b[0]);
      const ask = parseFloat(data.a[0]);

      this.cache.set(symbol, { price, bid, ask, ts: Date.now() });
      return price;
    } catch (err) {
      this.logger.error(`Failed to fetch price for ${symbol}: ${err.message}`);
      return null;
    }
  }

  /** Fetch prices for multiple symbols in parallel. */
  async getPrices(symbols: string[]): Promise<Map<string, number | null>> {
    const entries = await Promise.all(
      symbols.map(async (symbol) => [symbol, await this.getPrice(symbol)] as const),
    );
    return new Map(entries);
  }

  /** Get bid/ask spread for a symbol. */
  async getSpread(symbol: string): Promise<{ bid: number; ask: number } | null> {
    await this.getPrice(symbol); // populates cache
    const cached = this.cache.get(symbol);
    return cached ? { bid: cached.bid, ask: cached.ask } : null;
  }
}
