import { Injectable } from '@nestjs/common';
import { ExchangeCredentialsService } from '../../modules/exchange-credentials/exchange-credentials.service';
import { KrakenClient } from './kraken.client';

@Injectable()
export class KrakenClientFactory {
  constructor(private readonly exchangeCredentials: ExchangeCredentialsService) {}

  async forUser(userId: string): Promise<KrakenClient> {
    const credentials = await this.exchangeCredentials.getKrakenCredentials(userId);
    return new KrakenClient(credentials);
  }
}
