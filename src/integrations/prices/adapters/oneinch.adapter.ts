import { Injectable, Logger } from '@nestjs/common';
import { getAddress, parseUnits } from 'viem';
import type { Address } from 'viem';
import { OneInchService } from '../../oneinch/oneinch.service';
import { ENABLED_TOKENS } from '../../../config/tokens.config';
import { ONEINCH_PAIRS } from '../../../config/oneinch.config';
import type { PriceAdapter, Rate } from '../prices.types';

const CHAIN_ID = 1;

/**
 * Derives on-chain spot prices via 1inch quotes for all whitelisted tokens.
 *
 * Route/quote discovery is expensive — call `refreshRoutes()` hourly.
 * `fetchRates()` just returns the last cached result and is safe to call on every 10-min tick.
 */
@Injectable()
export class OneInchPriceAdapter implements PriceAdapter {
  readonly source = 'oneinch' as const;
  private readonly logger = new Logger(OneInchPriceAdapter.name);
  private cachedRates: Rate[] = [];

  constructor(private readonly oneinch: OneInchService) {}

  /** Returns the last set of rates from the most recent `refreshRoutes()` call. */
  async fetchRates(): Promise<Rate[]> {
    return this.cachedRates;
  }

  /** Fetches live quotes for all ONEINCH_PAIRS and updates the internal cache. */
  async refreshRoutes(): Promise<Rate[]> {
    const fetchedAt = new Date();
    const rates: Rate[] = [];

    for (const { from, to } of ONEINCH_PAIRS) {
      try {
        const srcToken = ENABLED_TOKENS.find((t) => t.symbol === from);
        const dstToken = ENABLED_TOKENS.find((t) => t.symbol === to);

        if (!srcToken?.addresses[CHAIN_ID] || !dstToken?.addresses[CHAIN_ID]) {
          this.logger.warn(`Token config missing for 1inch pair ${from}/${to}`);
          continue;
        }

        const srcAddress = getAddress(srcToken.addresses[CHAIN_ID]!) as Address;
        const dstAddress = getAddress(dstToken.addresses[CHAIN_ID]!) as Address;
        const srcAmount = parseUnits('1', srcToken.decimals);

        const quote = await this.oneinch.quote(CHAIN_ID, srcAddress, dstAddress, srcAmount);

        const dstAmount = Number(quote.dstAmount) / 10 ** dstToken.decimals;
        if (!isFinite(dstAmount) || dstAmount <= 0) continue;

        rates.push({ from, to, value: dstAmount, source: 'oneinch', fetchedAt, protocols: quote.protocols });
      } catch (err) {
        this.logger.warn(`1inch quote failed for ${from}/${to}: ${err.message}`);
      }
    }

    this.cachedRates = rates;
    this.logger.log(`1inch routes refreshed — ${rates.length}/${ONEINCH_PAIRS.length} pairs`);
    return rates;
  }
}
