import { FiatCurrency } from '@prisma/client';

export const OFFRAMP_QUEUE = 'offramp';

export interface OffRampJobData {
  executionId: string;
  /** Incremented on each polling re-enqueue; used to enforce max wait time without BullMQ retries */
  pollAttempt?: number;
}

// ---------------------------------------------------------------------------
// Kraken asset & pair mappings
// ---------------------------------------------------------------------------

/** Map from token symbol → Kraken asset name for deposits */
export const KRAKEN_DEPOSIT_ASSET: Record<string, string> = {
  USDT: 'USDT',
  USDC: 'USDC',
  ETH: 'ETH',
};

/** Map from token symbol → preferred Kraken deposit method substring (case-insensitive match) */
export const KRAKEN_DEPOSIT_METHOD_HINT: Record<string, string> = {
  USDT: 'Ethereum',
  USDC: 'Ethereum',
  ETH: 'Ethereum',
};

/** Map from (tokenSymbol, FiatCurrency) → Kraken trading pair */
export const KRAKEN_TRADING_PAIRS: Record<string, Partial<Record<FiatCurrency, string>>> = {
  USDT: { CHF: 'USDTCHF', EUR: 'USDTEUR' },
  USDC: { CHF: 'USDCCHF', EUR: 'USDCEUR' },
  ETH: { CHF: 'XETHZCHF', EUR: 'XETHZEUR' },
};

/** Map from FiatCurrency → Kraken asset name for fiat withdrawals */
export const KRAKEN_FIAT_ASSET: Partial<Record<FiatCurrency, string>> = {
  CHF: 'CHF',
  EUR: 'ZEUR',
};

/** Map from FiatCurrency → env var holding the Kraken withdrawal key for Wrytes AG's bank */
export const KRAKEN_WITHDRAW_KEY_ENV: Partial<Record<FiatCurrency, string>> = {
  CHF: 'KRAKEN_CHF_WITHDRAW_KEY',
  EUR: 'KRAKEN_EUR_WITHDRAW_KEY',
};

export function krakenPairFor(tokenSymbol: string, currency: FiatCurrency): string | null {
  return KRAKEN_TRADING_PAIRS[tokenSymbol]?.[currency] ?? null;
}
