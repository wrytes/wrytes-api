import { createHash, createHmac } from 'crypto';
import { KrakenCredentials } from '../../modules/exchange-credentials/exchange-credentials.service';

export class KrakenClient {
  private readonly baseUrl = 'https://api.kraken.com';
  private readonly publicKey: string;
  private readonly privateKey: string;
  readonly addressKey: string;

  constructor(credentials: KrakenCredentials) {
    this.publicKey = credentials.publicKey;
    this.privateKey = credentials.privateKey;
    this.addressKey = credentials.addressKey ?? '';
  }

  request({ method = 'GET', path = '', query = {}, body = {} as Record<string, any> }) {
    let url = this.baseUrl + path;

    if (Object.keys(query).length > 0) {
      url += '?' + this.toURLParams(query).toString();
    }

    const headers: Record<string, string> = {};
    let bodyString: string | undefined;

    if (method !== 'GET') {
      if (!body['nonce']) body['nonce'] = this.nonce();
      bodyString = this.toURLParams(body).toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['API-Key'] = this.publicKey;
      headers['API-Sign'] = this.sign(path, body['nonce'], bodyString);
    }

    return fetch(url, { method, headers, body: bodyString });
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
