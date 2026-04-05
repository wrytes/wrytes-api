import { encodeFunctionData, erc20Abi, getAddress } from 'viem';
import type { Address } from 'viem';
import type { ConversionContext, ConversionResult, ConversionStrategy } from './conversion.types';
import type { ChainId } from '../../../integrations/wallet/wallet.types';
import { ENABLED_TOKENS } from '../../../config/tokens.config';

const ERC4626_ABI = [
  {
    name: 'redeem',
    type: 'function',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * Redeems an ERC-4626 vault position (shares → underlying assets) from the Safe.
 * Optionally chains into another strategy for the redeemed underlying token
 * (e.g. redeem svZCHF → ZCHF, then swap ZCHF → USDC).
 */
export class RedeemErc4626Strategy implements ConversionStrategy {
  constructor(
    private readonly vaultAddress: Address,
    private readonly underlyingSymbol: string,
    private readonly next?: ConversionStrategy,
  ) {}

  async execute(
    ctx: ConversionContext,
    safeWalletId: string,
    safeAddress: Address,
    chainId: ChainId,
    shares: bigint,
  ): Promise<ConversionResult> {
    const underlyingToken = ENABLED_TOKENS.find((t) => t.symbol === this.underlyingSymbol);
    if (!underlyingToken?.addresses[chainId]) {
      throw new Error(`${this.underlyingSymbol} not configured for chain ${chainId}`);
    }
    const underlyingAddress = getAddress(underlyingToken.addresses[chainId]!);
    const publicClient = ctx.viem.getClient(chainId);

    // Snapshot balance before redeem to compute the delta (Safe may already hold some)
    const balanceBefore = await publicClient.readContract({
      address: underlyingAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [safeAddress],
    });

    const data = encodeFunctionData({
      abi: ERC4626_ABI,
      functionName: 'redeem',
      args: [shares, safeAddress, safeAddress],
    });

    const txHash = await ctx.safe.executeRaw(safeWalletId, this.vaultAddress, data, 0n);

    const balanceAfter = await publicClient.readContract({
      address: underlyingAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [safeAddress],
    });

    const redeemed = balanceAfter - balanceBefore;

    if (!this.next) {
      return { tokenSymbol: this.underlyingSymbol, tokenAddress: underlyingAddress, amount: redeemed, txHash };
    }

    return this.next.execute(ctx, safeWalletId, safeAddress, chainId, redeemed);
  }
}
