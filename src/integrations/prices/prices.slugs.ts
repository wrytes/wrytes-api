import type { PriceSourceId } from './prices.types';

/**
 * Maps each token symbol to its identifier on each price source.
 * Absence of a source key means that source cannot fetch this token directly —
 * the rate graph will resolve it via path-finding instead.
 */
export const TOKEN_SLUGS: Record<string, Partial<Record<PriceSourceId, string>>> = {
  WETH: {
    defillama: 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  WBTC: {
    defillama: 'ethereum:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  USDC: {
    defillama: 'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  USDT: {
    defillama: 'ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  ZCHF: {
    defillama: 'ethereum:0xB58E61C3098d85632Df34EecfB899A1Ed80921cB',
    oneinch: 'USDC', // quote ZCHF → USDC as a cross-check / fallback
  },
  ETH: {
    defillama: 'coingecko:ethereum',
  },
  cbBTC: {
    defillama: 'ethereum:0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  },
  EURC: {
    defillama: 'ethereum:0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
  },
};

/**
 * Explicit Kraken ticker pairs.
 * `from`/`to` are rate-graph nodes; `krakenPair` is the Kraken ticker symbol.
 *
 * The USD → CHF bridge via USDC lets the graph resolve any DefiLlama USD price to CHF
 * without a separate forex feed.
 */
export const KRAKEN_PAIRS: Array<{ from: string; to: string; krakenPair: string }> = [
  { from: 'ETH',  to: 'USD', krakenPair: 'ETHUSD'  },
  { from: 'ETH',  to: 'CHF', krakenPair: 'ETHCHF'  },
  { from: 'ETH',  to: 'EUR', krakenPair: 'ETHEUR'  },
  { from: 'USDT', to: 'CHF', krakenPair: 'USDTCHF'  },
  { from: 'USDT', to: 'EUR', krakenPair: 'USDTEUR'  },
  { from: 'USDC', to: 'CHF', krakenPair: 'USDCCHF'  },
  { from: 'USDC', to: 'EUR', krakenPair: 'USDCEUR'  },
  // Bridges: USD → CHF/EUR via USDC as proxy (USDC ≈ 1 USD)
  { from: 'USD',  to: 'CHF', krakenPair: 'USDCCHF'  },
  { from: 'USD',  to: 'EUR', krakenPair: 'USDCEUR'  },
];

/**
 * Tokens to price via a 1inch quote.
 * `from` is quoted against `to`; the resulting rate becomes a `from/to` edge in the graph.
 * Used for on-chain-only tokens without a CEX listing.
 */
export const ONEINCH_PAIRS: Array<{ from: string; to: string }> = [
  { from: 'ZCHF', to: 'USDC' },
];
