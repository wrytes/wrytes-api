import { registerAs } from '@nestjs/config';
import { ENABLED_TOKENS } from './tokens.config';

export default registerAs('oneinch', () => ({
  apiKey: process.env.ONEINCH_API_KEY ?? '',
  baseUrl: 'https://api.1inch.dev/swap/v6.0',
}));

// ---------------------------------------------------------------------------
// Quote pairs for on-chain spot prices via 1inch.
// All unique unordered pairs across whitelisted mainnet tokens are generated
// so the rate graph has maximum connectivity for cross-adapter pathfinding.
// The graph stores inverse edges automatically, so A→B covers B→A too.
// ---------------------------------------------------------------------------

export interface OneInchPair {
  from: string;
  to: string;
}

const mainnetTokens = ENABLED_TOKENS.filter((t) => t.addresses[1]);

export const ONEINCH_PAIRS: OneInchPair[] = mainnetTokens.flatMap((token, i) =>
  mainnetTokens.slice(i + 1).flatMap((other) => [
    { from: token.symbol, to: other.symbol },
    { from: other.symbol, to: token.symbol },
  ]),
);
