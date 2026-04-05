import type { Address } from 'viem';
import type { SafeService } from '../../../integrations/safe/safe.service';
import type { OneInchService } from '../../../integrations/oneinch/oneinch.service';
import type { WalletViemService } from '../../../integrations/wallet/wallet.viem.service';
import type { ChainId } from '../../../integrations/wallet/wallet.types';

export interface ConversionContext {
  safe: SafeService;
  oneinch: OneInchService;
  viem: WalletViemService;
}

export interface ConversionResult {
  /** Output token symbol (e.g. 'USDC', 'ETH') */
  tokenSymbol: string;
  /** Output token contract address, or null for native ETH */
  tokenAddress: Address | null;
  /** Output amount in the token's base units */
  amount: bigint;
  /** On-chain tx hash of the conversion */
  txHash: `0x${string}`;
}

export interface ConversionStrategy {
  execute(
    ctx: ConversionContext,
    safeWalletId: string,
    safeAddress: Address,
    chainId: ChainId,
    amount: bigint,
  ): Promise<ConversionResult>;
}
