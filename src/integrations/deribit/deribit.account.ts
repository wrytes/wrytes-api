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

  async getAccountSummaries(userId: string): Promise<GetAccountSummariesResult> {
    const c = await this.client.getClientForUser(userId);
    return this.client.unwrap(await c.account.getAccountSummaries({}));
  }

  async getAccountSummary(userId: string, currency: Currency): Promise<GetAccountSummaryResult> {
    const c = await this.client.getClientForUser(userId);
    return this.client.unwrap(await c.account.getAccountSummary({ currency }));
  }

  async getPortfolioMargins(userId: string, currency: Currency): Promise<AccountGetPortfolioMarginsResult> {
    const c = await this.client.getClientForUser(userId);
    return this.client.unwrap(await c.account.getPortfolioMargins({ currency }));
  }

  async getPosition(userId: string, instrument_name: string): Promise<GetPositionResult> {
    const c = await this.client.getClientForUser(userId);
    return this.client.unwrap(await c.account.getPosition({ instrument_name }));
  }

  async getTransactionLog(
    userId: string,
    currency: Currency,
    start_timestamp: number,
    end_timestamp: number,
    count?: number,
  ): Promise<GetTransactionLogResult> {
    const c = await this.client.getClientForUser(userId);
    return this.client.unwrap(
      await c.account.getTransactionLog({ currency, start_timestamp, end_timestamp, count }),
    );
  }
}
