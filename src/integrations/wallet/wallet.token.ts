import { Injectable, Logger } from '@nestjs/common';
import { erc20Abi } from 'viem';
import { WalletService } from './wallet.service';
import { WalletViemService } from './wallet.viem.service';
import { WalletTokenApprove, WalletTokenApproveLimit } from './wallet.types';

@Injectable()
export class WalletToken {
  private readonly logger = new Logger(WalletToken.name);

  constructor(
    private readonly wallet: WalletService,
    private readonly viem: WalletViemService,
  ) {}

  async setApprove({ chainId, address, spender, value }: WalletTokenApprove): Promise<void> {
    this.logger.warn(`Approving — chain: ${chainId}, contract: ${address}, value: ${value}`);

    const writeClient = this.wallet.client[chainId];
    const pubClient = this.viem.getClient(chainId);

    const hash = await writeClient.writeContract({
      chain: writeClient.chain,
      account: this.wallet.account,
      address,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, value],
    });

    await pubClient.waitForTransactionReceipt({ hash });

    this.logger.log(`Approved — chain: ${chainId}, contract: ${address}`);
  }

  async setApproveLimit({
    chainId,
    address,
    spender,
    value,
    limit,
  }: WalletTokenApproveLimit): Promise<void> {
    const pubClient = this.viem.getClient(chainId);

    const allowance = await pubClient.readContract({
      address,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [this.wallet.address, spender],
    });

    if (allowance < limit) {
      await this.setApprove({ chainId, address, spender, value });
    }
  }
}
