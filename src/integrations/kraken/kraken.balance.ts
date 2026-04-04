import { Injectable } from '@nestjs/common';
import { KrakenClient } from './kraken.client';
import { BalanceResponse } from './kraken.types';

@Injectable()
export class KrakenBalance {
  constructor(private readonly client: KrakenClient) {}

  async getBalance(): Promise<BalanceResponse> {
    const res = await this.client.request({ method: 'POST', path: '/0/private/Balance' });
    return res.json() as Promise<BalanceResponse>;
  }
}
