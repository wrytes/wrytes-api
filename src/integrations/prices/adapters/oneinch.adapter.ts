import { Injectable, Logger } from '@nestjs/common';
import { getAddress, parseUnits } from 'viem';
import type { Address } from 'viem';
import { OneInchService } from '../../oneinch/oneinch.service';
import { ENABLED_TOKENS } from '../../../config/tokens.config';
import { ONEINCH_PAIRS } from '../prices.slugs';
import type { PriceAdapter, Rate } from '../prices.types';

const CHAIN_ID = 1;

/**
 * Derives on-chain spot prices via 1inch quotes.
 * Intended for tokens without a CEX listing (e.g. ZCHF).
 * Each configured pair in ONEINCH_PAIRS is quoted independently.
 */
@Injectable()
export class OneInchPriceAdapter implements PriceAdapter {
  readonly source = 'oneinch' as const;
  private readonly logger = new Logger(OneInchPriceAdapter.name);

  constructor(private readonly oneinch: OneInchService) {}

  async fetchRates(): Promise<Rate[]> {
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

        // dstAmount is in dstToken base units — normalise to human-readable
        const dstAmount = Number(quote.dstAmount) / 10 ** dstToken.decimals;
        if (!isFinite(dstAmount) || dstAmount <= 0) continue;

        rates.push({ from, to, value: dstAmount, source: 'oneinch', fetchedAt });
      } catch (err) {
        this.logger.warn(`1inch quote failed for ${from}/${to}: ${err.message}`);
      }
    }

    this.logger.debug(`Fetched ${rates.length} rates from 1inch`);
    return rates;
  }
}
