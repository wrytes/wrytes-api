import { Injectable, Logger } from '@nestjs/common';
import { Hex } from 'viem';
import { mainnet } from 'viem/chains';
import { KrakenClientFactory } from './kraken.factory';
import {
  WithdrawRequest,
  WithdrawResponse,
  WithdrawStatusRequest,
  WithdrawStatusResponse,
} from './kraken.types';
import { WalletViemService } from '../../integrations/wallet/wallet.viem.service';

@Injectable()
export class KrakenWithdraw {
  private readonly logger = new Logger(KrakenWithdraw.name);

  constructor(
    private readonly factory: KrakenClientFactory,
    private readonly viem: WalletViemService,
  ) {}

  async withdraw(userId: string, data: WithdrawRequest): Promise<WithdrawResponse> {
    const client = await this.factory.forUser(userId);
    // Use the key from credentials if not explicitly provided
    const body = data.key ? data : { ...data, key: client.addressKey };
    const res = await client.request({ method: 'POST', path: '/0/private/Withdraw', body });
    return res.json() as Promise<WithdrawResponse>;
  }

  async withdrawStatus(userId: string, data: WithdrawStatusRequest): Promise<WithdrawStatusResponse> {
    const client = await this.factory.forUser(userId);
    const res = await client.request({
      method: 'POST',
      path: '/0/private/WithdrawStatus',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<WithdrawStatusResponse>;
  }

  /** Initiates a withdrawal and waits for the on-chain transaction receipt. */
  async waitForWithdrawal(userId: string, data: WithdrawRequest) {
    const withdrawal = await this.withdraw(userId, data);
    const statusAll = await this.withdrawStatus(userId, { asset: data.asset, limit: 10 });
    const entry = statusAll.result.find((i) => i.refid === withdrawal.result.refid);
    if (!entry) return null;

    const pubClient = this.viem.getClient(mainnet.id as 1);
    return pubClient.waitForTransactionReceipt({ hash: entry.txid as Hex });
  }
}
