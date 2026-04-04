import { Injectable } from '@nestjs/common';
import {
  Currency,
  WalletCreateDepositAddressResult,
  WalletGetDepositsResult,
  WalletGetWithdrawalsResult,
  WalletWithdrawParams,
  WalletWithdrawResult,
} from '@wrytes/deribit-api-client';
import { DeribitClientService } from './deribit.client.service';

@Injectable()
export class DeribitWallet {
  constructor(private readonly client: DeribitClientService) {}

  async getDeposits(userId: string, currency: Currency, count?: number, offset?: number): Promise<WalletGetDepositsResult> {
    const c = await this.client.getClientForUser(userId);
    return this.client.unwrap(await c.wallet.getDeposits({ currency, count, offset }));
  }

  async getWithdrawals(userId: string, currency: Currency, count?: number, offset?: number): Promise<WalletGetWithdrawalsResult> {
    const c = await this.client.getClientForUser(userId);
    return this.client.unwrap(await c.wallet.getWithdrawals({ currency, count, offset }));
  }

  async withdraw(userId: string, params: WalletWithdrawParams): Promise<WalletWithdrawResult> {
    const c = await this.client.getClientForUser(userId);
    return this.client.unwrap(await c.wallet.withdraw(params));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCurrentDepositAddress(userId: string, currency: Currency): Promise<any> {
    const c = await this.client.getClientForUser(userId);
    return this.client.unwrap(await c.wallet.getCurrentDepositaddress({ currency }));
  }

  async createDepositAddress(userId: string, currency: Currency): Promise<WalletCreateDepositAddressResult> {
    const c = await this.client.getClientForUser(userId);
    return this.client.unwrap(await c.wallet.createDepositaddress({ currency }));
  }
}
