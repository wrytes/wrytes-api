import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KrakenClient } from './kraken.client';

@Injectable()
export class KrakenClientFactory {
  private readonly client: KrakenClient;

  constructor(configService: ConfigService) {
    this.client = new KrakenClient({
      publicKey: configService.get<string>('kraken.api.publicKey')!,
      privateKey: configService.get<string>('kraken.api.privateKey')!,
      addressKey: configService.get<string>('kraken.api.addressKey'),
    });
  }

  forOperator(): KrakenClient {
    return this.client;
  }

  /** @deprecated use forOperator() — kept for call-site compatibility during migration */
  forUser(_userId: string): Promise<KrakenClient> {
    return Promise.resolve(this.client);
  }
}
