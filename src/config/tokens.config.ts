import { Address } from 'viem';

export interface EnabledToken {
  symbol: string;
  name: string;
  decimals: number;
  addresses: Partial<Record<number, Address>>;
}

export const ENABLED_TOKENS: EnabledToken[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addresses: {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    addresses: {
      1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    },
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    addresses: {
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    addresses: {
      1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    },
  },
  {
    symbol: 'ZCHF',
    name: 'Frankencoin',
    decimals: 18,
    addresses: {
      1: '0xB58E61C3098d85632Df34EecfB899A1Ed80921cB',
    },
  },
  {
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped BTC',
    decimals: 8,
    addresses: {
      1: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    },
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    addresses: {
      1: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
    },
  },
];

// ---------------------------------------------------------------------------
// DefiLlama slug map — auto-derived from ENABLED_TOKENS mainnet addresses.
// ETH (native) has no contract so it gets a manual coingecko slug.
// ---------------------------------------------------------------------------

export const TOKEN_SLUGS: Record<string, Partial<Record<string, string>>> = {
  ETH: { defillama: 'coingecko:ethereum' },
  ...Object.fromEntries(
    ENABLED_TOKENS
      .filter((t) => t.addresses[1])
      .map((t) => [t.symbol, { defillama: `ethereum:${t.addresses[1]}` }]),
  ),
};

// ---------------------------------------------------------------------------
// ETH / WETH alias — same asset, wrap/unwrap only. Injected as a 1:1 graph edge.
// ---------------------------------------------------------------------------

export const ETH_WETH_ALIAS = { from: 'ETH', to: 'WETH', value: 1 } as const;

// ---------------------------------------------------------------------------
// Peg config — assets sharing a fiat denomination that can still trade freely.
// The price service resolves the live asset/peg rate and persists it as a
// `derived` rate so callers can observe the current peg deviation.
// ---------------------------------------------------------------------------

export interface PegEntry {
  asset: string;
  peg: string;
}

export const PEG_CONFIG: PegEntry[] = [
  { asset: 'ZCHF', peg: 'CHF' },
  { asset: 'USDC', peg: 'USD' },
  { asset: 'USDT', peg: 'USD' },
  { asset: 'EURC', peg: 'EUR' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getTokenByAddress(address: Address, chainId: number): EnabledToken | undefined {
  return ENABLED_TOKENS.find(
    (token) => token.addresses[chainId]?.toLowerCase() === address.toLowerCase(),
  );
}

export function getEnabledTokenAddresses(chainId: number): Address[] {
  return ENABLED_TOKENS.map((token) => token.addresses[chainId]).filter(
    (address): address is Address => !!address,
  );
}
