import { Address } from 'viem';

// ---------------------------------------------------------------------------
// Quote
// ---------------------------------------------------------------------------

export interface OneInchQuote {
  srcToken: Address;
  dstToken: Address;
  srcAmount: bigint;
  dstAmount: bigint;
  gas: bigint;
  protocols: string[];
}

export interface QuoteParams {
  /** Fee in basis points (0–300). Requires 1inch partner agreement. */
  fee?: number;
  /** Comma-separated list of protocols to include. Omit for all. */
  protocols?: string;
  /** Comma-separated connector token addresses for routing. */
  connectorTokens?: string;
  /** Maximum number of intermediate tokens in a route (1–3). */
  complexityLevel?: number;
  /** Maximum number of main route parts (1–50). */
  mainRouteParts?: number;
  /** Maximum number of route parts split across pools (1–100). */
  parts?: number;
}

// ---------------------------------------------------------------------------
// Swap
// ---------------------------------------------------------------------------

export interface OneInchSwapTx {
  from: Address;
  to: Address;
  data: `0x${string}`;
  value: bigint;
  gas: bigint;
  gasPrice: bigint | null;
}

export interface OneInchSwap {
  srcToken: Address;
  dstToken: Address;
  srcAmount: bigint;
  dstAmount: bigint;
  tx: OneInchSwapTx;
}

export interface SwapParams extends QuoteParams {
  /** Slippage tolerance in percent (0.1–50). Default: 1. */
  slippage?: number;
  /** Recipient address. Defaults to `from`. */
  receiver?: Address;
  /** Disable estimate to skip balance/allowance checks. */
  disableEstimate?: boolean;
}

// ---------------------------------------------------------------------------
// Approve
// ---------------------------------------------------------------------------

export interface OneInchApproveTx {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  gasPrice: bigint | null;
}

// ---------------------------------------------------------------------------
// Raw API shapes (internal)
// ---------------------------------------------------------------------------

export interface RawQuoteResponse {
  dstAmount: string;
  gas?: number;
  protocols?: Array<Array<Array<{ name: string }>>>;
}

export interface RawSwapResponse {
  dstAmount: string;
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: number;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
}

export interface RawAllowanceResponse {
  allowance: string;
}

export interface RawApproveTxResponse {
  to: string;
  data: string;
  value: string;
  gasPrice?: string;
}
