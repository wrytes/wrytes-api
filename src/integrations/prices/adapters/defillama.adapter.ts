import { Injectable, Logger } from '@nestjs/common';
import { TOKEN_SLUGS } from '../../../config/tokens.config';
import type { PriceAdapter, Rate } from '../prices.types';

interface DefiLlamaResponse {
  coins: Record<string, {
    price: number;
    symbol: string;
    timestamp: number;
    confidence?: number;
  }>;
}

/**
 * Fetches USD prices from the DefiLlama Coins API.
 * All tokens with a `defillama` slug are batched into a single request.
 * Returns SYMBOL → USD rates.
 */
@Injectable()
export class DefiLlamaPriceAdapter implements PriceAdapter {
  readonly source = 'defillama' as const;
  private readonly logger = new Logger(DefiLlamaPriceAdapter.name);

  async fetchRates(): Promise<Rate[]> {
    // Build slug → symbol reverse map
    const slugToSymbol = new Map<string, string>();
    for (const [symbol, slugs] of Object.entries(TOKEN_SLUGS)) {
      if (slugs.defillama) slugToSymbol.set(slugs.defillama, symbol);
    }

    if (slugToSymbol.size === 0) return [];

    const coins = [...slugToSymbol.keys()].join(',');

    let json: DefiLlamaResponse;
    try {
      const res = await fetch(`https://coins.llama.fi/prices/current/${coins}`);
      json = await res.json();
    } catch (err) {
      this.logger.error(`DefiLlama fetch failed: ${err.message}`);
      return [];
    }

    const fetchedAt = new Date();
    const rates: Rate[] = [];

    for (const [slug, data] of Object.entries(json.coins ?? {})) {
      const symbol = slugToSymbol.get(slug);
      if (!symbol) continue;

      const value = data.price;
      if (!isFinite(value) || value <= 0) continue;

      rates.push({ from: symbol, to: 'USD', value, source: 'defillama', fetchedAt });
    }

    this.logger.debug(`Fetched ${rates.length} rates from DefiLlama`);
    return rates;
  }
}
