import { registerAs } from '@nestjs/config';

/** Maps token symbols to Kraken pair strings used by the Ticker endpoint. */
export const TOKEN_TO_KRAKEN_PAIR: Record<string, string> = {
  CHF: 'usdt-chf',
  ZCHF: 'USDT/CHF',
  // WETH: 'XETHZUSD',
  // WBTC: 'XBTZUSD',
  // USDC: 'USDC/USD',
};

export default registerAs('kraken', () => ({
  tokenPairs: TOKEN_TO_KRAKEN_PAIR,

  fees: {
    makerFee: 0.16,
    takerFee: 0.26,
  },

  api: {
    publicKey: process.env.KRAKEN_PUBLIC_KEY ?? '',
    privateKey: process.env.KRAKEN_PRIVATE_KEY ?? '',
    addressKey: process.env.KRAKEN_ADDRESS_KEY ?? '',
  },
}));
