import { Injectable, Logger } from '@nestjs/common';
import { Address, erc20Abi } from 'viem';
import { WalletService } from './wallet.service';
import { WalletViemService } from './wallet.viem.service';
import { WalletTokenList } from './wallet.tokens';
import {
  ChainId,
  SUPPORTED_CHAIN_IDS,
  TokenBalanceMap,
  ChainBalance,
  WalletChainBalanceMap,
} from './wallet.types';

@Injectable()
export class WalletBalance {
  private readonly logger = new Logger(WalletBalance.name);

  constructor(
    private readonly wallet: WalletService,
    private readonly viem: WalletViemService,
    private readonly tokenList: WalletTokenList,
  ) {}

  async getBalance(chainIds?: ChainId[]): Promise<WalletChainBalanceMap> {
    const chains = chainIds ?? SUPPORTED_CHAIN_IDS;
    const result: WalletChainBalanceMap = {};

    for (const chainId of chains) {
      try {
        result[chainId] = await this.getChainBalance(chainId);
      } catch (error) {
        this.logger.error(
          `Failed to fetch balance for ${this.wallet.getChainName(chainId)} (${chainId}): ${error.message}`,
        );
      }
    }

    return result;
  }

  private async getChainBalance(chainId: ChainId): Promise<ChainBalance> {
    const client = this.viem.getClient(chainId);

    const nativeBalance = await client.getBalance({ address: this.wallet.address });

    const tokenAddresses = this.tokenList.getTokenAddresses(chainId);
    const tokens: TokenBalanceMap = {};

    if (tokenAddresses.length > 0) {
      Object.assign(tokens, await this.getTokenBalances(chainId, tokenAddresses));
    }

    return { native: String(nativeBalance), tokens };
  }

  private async getTokenBalances(chainId: ChainId, addresses: Address[]): Promise<TokenBalanceMap> {
    const client = this.viem.getClient(chainId);
    const balances: TokenBalanceMap = {};

    const results = await Promise.all(
      addresses.map((address) =>
        client
          .readContract({
            address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [this.wallet.address],
          })
          .then((balance) => ({ address, balance, success: true }))
          .catch((err) => {
            this.logger.debug(`Skipping token ${address} on chain ${chainId}: ${err.message}`);
            return { address, balance: 0n, success: false };
          }),
      ),
    );

    for (const { address, balance, success } of results) {
      if (success && balance > 0n) balances[address] = String(balance);
    }

    return balances;
  }
}
