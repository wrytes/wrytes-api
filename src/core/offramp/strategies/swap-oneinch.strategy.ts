import { getAddress } from 'viem';
import type { Address } from 'viem';
import type { ConversionContext, ConversionResult, ConversionStrategy } from './conversion.types';
import type { ChainId } from '../../../integrations/wallet/wallet.types';
import { ENABLED_TOKENS } from '../../../config/tokens.config';

/**
 * Swaps srcToken → dstToken via the 1inch router, executed from the Safe.
 * Handles approve if the Safe's allowance is insufficient.
 */
export class SwapOneInchStrategy implements ConversionStrategy {
  constructor(
    private readonly srcSymbol: string,
    private readonly dstSymbol: string,
    private readonly slippage = 0.5,
  ) {}

  async execute(
    ctx: ConversionContext,
    safeWalletId: string,
    safeAddress: Address,
    chainId: ChainId,
    amount: bigint,
  ): Promise<ConversionResult> {
    const srcToken = ENABLED_TOKENS.find((t) => t.symbol === this.srcSymbol);
    const dstToken = ENABLED_TOKENS.find((t) => t.symbol === this.dstSymbol);

    if (!srcToken?.addresses[chainId]) throw new Error(`${this.srcSymbol} not configured for chain ${chainId}`);
    if (!dstToken?.addresses[chainId]) throw new Error(`${this.dstSymbol} not configured for chain ${chainId}`);

    const srcAddress = getAddress(srcToken.addresses[chainId]!);
    const dstAddress = getAddress(dstToken.addresses[chainId]!);

    // disableEstimate because the Safe is the sender — 1inch's estimator can't simulate multisig
    console.log('[SwapOneInch] calling swap', { chainId, srcAddress, dstAddress, amount: amount.toString(), safeAddress });
    const swap = await ctx.oneinch.swap(chainId, srcAddress, dstAddress, amount, safeAddress, {
      slippage: this.slippage,
      disableEstimate: true,
    });
    console.log('[SwapOneInch] swap response', JSON.stringify(swap, (_, v) => typeof v === 'bigint' ? v.toString() : v));

    console.log('[SwapOneInch] calling allowance');
    const allowance = await ctx.oneinch.allowance(chainId, srcAddress, safeAddress);
    console.log('[SwapOneInch] allowance', allowance.toString());

    if (allowance < amount) {
      // Batch approve + swap into a single Safe tx so they're atomic
      console.log('[SwapOneInch] calling approveCalldata');
      const approveTx = await ctx.oneinch.approveCalldata(chainId, srcAddress);
      console.log('[SwapOneInch] approveTx', JSON.stringify(approveTx, (_, v) => typeof v === 'bigint' ? v.toString() : v));
      console.log('[SwapOneInch] executing batch approve+swap');
      const txHash = await ctx.safe.executeManyRaw(safeWalletId, [
        { to: approveTx.to, data: approveTx.data, value: approveTx.value },
        { to: swap.tx.to, data: swap.tx.data, value: swap.tx.value },
      ]);
      return { tokenSymbol: this.dstSymbol, tokenAddress: dstAddress, amount: swap.dstAmount, txHash };
    }

    console.log('[SwapOneInch] executing swap (no approve needed)');
    const txHash = await ctx.safe.executeRaw(safeWalletId, swap.tx.to, swap.tx.data, swap.tx.value);

    return { tokenSymbol: this.dstSymbol, tokenAddress: dstAddress, amount: swap.dstAmount, txHash };
  }
}
