export interface EtherscanApiResponse<T = any> {
  status: string;
  message: string;
  result: T;
}

export interface AccountBalance {
  account: string;
  balance: string;
}

export interface Transaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

export interface TokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

export interface TokenBalance {
  TokenAddress: string;
  TokenName: string;
  TokenSymbol: string;
  TokenQuantity: string;
  TokenDivisor: string;
  TokenPrice: string;
}

export interface GasOracle {
  LastBlock: string;
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
  suggestBaseFee: string;
  gasUsedRatio: string;
}

export interface AddressTag {
  nametag: string;
  url: string;
  labels: string[];
  reputation: string;
  lastUpdated: string;
}

export enum CacheType {
  BALANCE = 'balance',
  TRANSACTIONS = 'transactions',
  TOKEN_TRANSFERS = 'token_transfers',
  TOKEN_BALANCE = 'token_balance',
  GAS_ORACLE = 'gas_oracle',
  BLOCK_INFO = 'block_info',
  ADDRESS_TAG = 'address_tag',
}

export enum ChainId {
  ETHEREUM = 1,
  BSC = 56,
  POLYGON = 137,
  ARBITRUM = 42161,
  BASE = 8453,
  OPTIMISM = 10,
  AVALANCHE = 43114,
}
