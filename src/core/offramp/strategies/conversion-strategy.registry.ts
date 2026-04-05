import { Injectable } from '@nestjs/common';
import type { ConversionStrategy } from './conversion.types';
import { UnwrapWethStrategy } from './unwrap-weth.strategy';
import { SwapOneInchStrategy } from './swap-oneinch.strategy';
// import { RedeemErc4626Strategy } from './redeem-erc4626.strategy';

/**
 * Maps token symbols to their pre-deposit conversion strategy.
 * Tokens absent from this registry are assumed to be directly depositable on Kraken.
 *
 * To add a new token:
 *   - Simple swap:   new SwapOneInchStrategy('SRC', 'DST')
 *   - Unwrap:        new UnwrapWethStrategy()
 *   - ERC-4626 vault with subsequent swap:
 *       new RedeemErc4626Strategy(VAULT_ADDRESS, 'UNDERLYING', new SwapOneInchStrategy('UNDERLYING', 'USDC'))
 */
@Injectable()
export class ConversionStrategyRegistry {
	private readonly strategies = new Map<string, ConversionStrategy>([
		['WETH', new UnwrapWethStrategy()],
		['ZCHF', new SwapOneInchStrategy('ZCHF', 'USDT')],

		// Example: ERC-4626 vault (svZCHF → ZCHF → USDC)
		// ['svZCHF', new RedeemErc4626Strategy(
		//   '0x...vaultAddress',
		//   'ZCHF',
		//   new SwapOneInchStrategy('ZCHF', 'USDC'),
		// )],
	]);

	get(tokenSymbol: string): ConversionStrategy | null {
		return this.strategies.get(tokenSymbol) ?? null;
	}
}
