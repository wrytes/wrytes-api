export interface AlchemyRpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

// ---------------------------------------------------------------------------
// Asset Transfers (alchemy_getAssetTransfers)
// ---------------------------------------------------------------------------

export interface RawContract {
  value: string | null;
  address: string | null;
  decimal: string | null;
}

export interface AssetTransfer {
  blockNum: string;
  uniqueId: string;
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  asset: string | null;
  category: 'external' | 'internal' | 'erc20' | 'erc721' | 'erc1155';
  rawContract: RawContract;
  metadata?: { blockTimestamp: string };
}

export interface AssetTransfersResult {
  transfers: AssetTransfer[];
  pageKey?: string;
}

// ---------------------------------------------------------------------------
// Token Balances (alchemy_getTokenBalances)
// ---------------------------------------------------------------------------

export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

export interface TokenBalancesResult {
  address: string;
  tokenBalances: TokenBalance[];
  pageKey?: string;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

export enum CacheType {
  BALANCE            = 'balance',
  TRANSACTIONS       = 'transactions',
  INTERNAL_TXS       = 'internal_txs',
  TOKEN_TRANSFERS    = 'token_transfers',
  TOKEN_BALANCE      = 'token_balance',
  TOKEN_BALANCES     = 'token_balances',
}
