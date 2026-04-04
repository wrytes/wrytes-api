import { Injectable } from '@nestjs/common';
import { KrakenClientFactory } from './kraken.factory';
import { BalanceResponse } from './kraken.types';

@Injectable()
export class KrakenBalance {
  constructor(private readonly factory: KrakenClientFactory) {}

  async getBalance(userId: string): Promise<BalanceResponse> {
    const client = await this.factory.forUser(userId);
    const res = await client.request({ method: 'POST', path: '/0/private/Balance' });
    return res.json() as Promise<BalanceResponse>;
  }
}
