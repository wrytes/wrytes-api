import { Injectable } from '@nestjs/common';
import {
  AccountGetPortfolioMarginsResult,
  Currency,
  GetAccountSummariesResult,
  GetAccountSummaryResult,
  GetPositionResult,
  GetTransactionLogResult,
} from '@wrytes/deribit-api-client';
import { DeribitClientService } from './deribit.client.service';

@Injectable()
export class DeribitAccount {
  constructor(private readonly client: DeribitClientService) {}

  async getAccountSummaries(): Promise<GetAccountSummariesResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.account.getAccountSummaries({}));
  }

  async getAccountSummary(currency: Currency): Promise<GetAccountSummaryResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.account.getAccountSummary({ currency }));
  }

  async getPortfolioMargins(currency: Currency): Promise<AccountGetPortfolioMarginsResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.account.getPortfolioMargins({ currency }));
  }

  async getPosition(instrument_name: string): Promise<GetPositionResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.account.getPosition({ instrument_name }));
  }

  async getTransactionLog(
    currency: Currency,
    start_timestamp: number,
    end_timestamp: number,
    count?: number,
  ): Promise<GetTransactionLogResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(
      await c.account.getTransactionLog({ currency, start_timestamp, end_timestamp, count }),
    );
  }
}
