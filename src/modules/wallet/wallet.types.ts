import { Address } from 'viem';

export type ChainId = 1; // extend: | 100 | 8453 | 42161

export const SUPPORTED_CHAIN_IDS: ChainId[] = [1];

export const CHAIN_NAMES: Record<ChainId, string> = {
  1: 'Ethereum',
};

export const ALCHEMY_CHAIN_SLUGS: Record<ChainId, string> = {
  1: 'eth-mainnet',
};

export type TokenBalanceMap = {
  [address: Address]: string;
};

export type ChainBalance = {
  native: string;
  tokens: TokenBalanceMap;
};

export type WalletChainBalanceMap = {
  [K in ChainId]?: ChainBalance;
};

export type WalletTokenApprove = {
  chainId: ChainId;
  address: Address;
  spender: Address;
  value: bigint;
};

export type WalletTokenApproveLimit = {
  chainId: ChainId;
  address: Address;
  spender: Address;
  value: bigint;
  limit: bigint;
};
