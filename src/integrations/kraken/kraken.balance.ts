import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Hex } from 'viem';
import { mainnet } from 'viem/chains';
import { KrakenClient } from './kraken.client';
import {
  BalanceResponse,
  WithdrawRequest,
  WithdrawResponse,
  WithdrawStatusRequest,
  WithdrawStatusResponse,
} from './kraken.types';
import { WalletViemService } from '../../modules/wallet/wallet.viem.service';

@Injectable()
export class KrakenBalance {
  private readonly logger = new Logger(KrakenBalance.name);
  private readonly addressKey: string;

  constructor(
    private readonly client: KrakenClient,
    private readonly configService: ConfigService,
    private readonly viem: WalletViemService,
  ) {
    this.addressKey = this.configService.get<string>('kraken.api.addressKey') ?? '';
  }

  async getBalance(): Promise<BalanceResponse> {
    const res = await this.client.request({ method: 'POST', path: '/0/private/Balance' });
    return res.json() as Promise<BalanceResponse>;
  }

  async withdraw(data: WithdrawRequest): Promise<WithdrawResponse> {
    const body = data.key ? data : { ...data, key: this.addressKey };
    const res = await this.client.request({ method: 'POST', path: '/0/private/Withdraw', body });
    return res.json() as Promise<WithdrawResponse>;
  }

  async withdrawStatus(data: WithdrawStatusRequest): Promise<WithdrawStatusResponse> {
    const res = await this.client.request({
      method: 'POST',
      path: '/0/private/WithdrawStatus',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<WithdrawStatusResponse>;
  }

  /**
   * Initiates a withdrawal and waits for the on-chain transaction receipt.
   */
  async waitForWithdrawal(data: WithdrawRequest) {
    const withdrawal = await this.withdraw(data);

    const statusAll = await this.withdrawStatus({ asset: data.asset, limit: 10 });
    const entry = statusAll.result.find((i) => i.refid === withdrawal.result.refid);
    if (!entry) return null;

    const client = this.viem.getClient(mainnet.id as 1);
    return client.waitForTransactionReceipt({ hash: entry.txid as Hex });
  }
}
