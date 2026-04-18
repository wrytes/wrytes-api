import { registerAs } from '@nestjs/config';

export default registerAs('kraken', () => ({
	api: {
		publicKey: process.env.KRAKEN_PUBLIC_KEY ?? '',
		privateKey: process.env.KRAKEN_PRIVATE_KEY ?? '',
		addressKey: process.env.KRAKEN_ADDRESS_KEY ?? '',
	},
}));

// ---------------------------------------------------------------------------
// Ticker pairs fetched from the Kraken public API.
// `from`/`to` are rate-graph node names; `krakenPair` is the Kraken ticker symbol.
// The USD→CHF/EUR bridge rows let the graph resolve any USD price to CHF/EUR
// without a dedicated forex feed.
// ---------------------------------------------------------------------------

export interface KrakenPair {
  from: string;
  to: string;
  krakenPair: string;
}

export const KRAKEN_PAIRS: KrakenPair[] = [
  { from: 'ETH',  to: 'USD', krakenPair: 'ETHUSD'  },
  { from: 'ETH',  to: 'CHF', krakenPair: 'ETHCHF'  },
  { from: 'ETH',  to: 'EUR', krakenPair: 'ETHEUR'  },
  { from: 'USDT', to: 'CHF', krakenPair: 'USDTCHF' },
  { from: 'USDT', to: 'EUR', krakenPair: 'USDTEUR' },
  { from: 'USDC', to: 'CHF', krakenPair: 'USDCCHF' },
  { from: 'USDC', to: 'EUR', krakenPair: 'USDCEUR' },
  // Bridges: USD → CHF/EUR via USDC as proxy (USDC ≈ 1 USD)
  { from: 'USD',  to: 'CHF', krakenPair: 'USDCCHF' },
  { from: 'USD',  to: 'EUR', krakenPair: 'USDCEUR' },
];
