import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';

@Injectable()
export class KrakenClient {
  private readonly logger = new Logger(KrakenClient.name);
  private readonly baseUrl = 'https://api.kraken.com';
  private readonly publicKey: string;
  private readonly privateKey: string;

  constructor(private readonly configService: ConfigService) {
    this.publicKey = this.configService.get<string>('kraken.api.publicKey') ?? '';
    this.privateKey = this.configService.get<string>('kraken.api.privateKey') ?? '';

    if (!this.publicKey || !this.privateKey) {
      this.logger.warn('KRAKEN_PUBLIC_KEY / KRAKEN_PRIVATE_KEY not set — private endpoints will fail');
    }
  }

  request({ method = 'GET', path = '', query = {}, body = {} as Record<string, any> }) {
    let url = this.baseUrl + path;

    if (Object.keys(query).length > 0) {
      url += '?' + this.toURLParams(query).toString();
    }

    const headers: Record<string, string> = {};
    let bodyString: string | null = null;

    if (Object.keys(body).length > 0) {
      if (!body['nonce']) body['nonce'] = this.nonce();
      bodyString = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    if (this.publicKey) {
      const nonce: string = body['nonce'] ?? this.nonce();
      headers['API-Key'] = this.publicKey;
      headers['API-Sign'] = this.sign(path, nonce, bodyString ?? '');
    }

    return fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : bodyString,
    });
  }

  private nonce(): string {
    return Date.now().toString();
  }

  private sign(path: string, nonce: string, data: string): string {
    const hash = createHash('sha256').update(nonce + data).digest('binary');
    return createHmac('sha512', Buffer.from(this.privateKey, 'base64'))
      .update(path + hash, 'binary')
      .digest('base64');
  }

  private toURLParams(obj: Record<string, string>): URLSearchParams {
    return new URLSearchParams(
      Object.entries(obj).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v]),
    );
  }
}
