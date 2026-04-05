import { encodeFunctionData } from 'viem';
import type { Address } from 'viem';
import type { ConversionContext, ConversionResult, ConversionStrategy } from './conversion.types';
import type { ChainId } from '../../../integrations/wallet/wallet.types';
import { ENABLED_TOKENS } from '../../../config/tokens.config';

const WETH_ABI = [
  {
    name: 'withdraw',
    type: 'function',
    inputs: [{ name: 'wad', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * Unwraps WETH → native ETH by calling WETH.withdraw() on the Safe.
 * Output: ETH (native, tokenAddress = null), same amount.
 */
export class UnwrapWethStrategy implements ConversionStrategy {
  async execute(
    ctx: ConversionContext,
    safeWalletId: string,
    _safeAddress: Address,
    chainId: ChainId,
    amount: bigint,
  ): Promise<ConversionResult> {
    const wethAddress = ENABLED_TOKENS.find((t) => t.symbol === 'WETH')?.addresses[chainId];
    if (!wethAddress) throw new Error(`WETH address not configured for chain ${chainId}`);

    const data = encodeFunctionData({ abi: WETH_ABI, functionName: 'withdraw', args: [amount] });
    const txHash = await ctx.safe.executeRaw(safeWalletId, wethAddress, data, 0n);

    return { tokenSymbol: 'ETH', tokenAddress: null, amount, txHash };
  }
}
