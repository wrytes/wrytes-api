import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeribitApiClient, GrantType, RequestQuery } from '@wrytes/deribit-api-client';
import { ExchangeCredentialsService } from '../../modules/exchange-credentials/exchange-credentials.service';

const WS_OPEN = 1; // WebSocket.OPEN

@Injectable()
export class DeribitClientService implements OnModuleDestroy {
  private readonly logger = new Logger(DeribitClientService.name);
  private readonly clients = new Map<string, DeribitApiClient>();

  constructor(
    private readonly configService: ConfigService,
    private readonly exchangeCredentials: ExchangeCredentialsService,
  ) {}

  async getClientForUser(userId: string, timeoutMs = 8000): Promise<DeribitApiClient> {
    if (this.clients.has(userId)) {
      const client = this.clients.get(userId)!;
      await this.waitForSocketOpen(client, timeoutMs);
      return client;
    }

    const credentials = await this.exchangeCredentials.getDeribitCredentials(userId);
    const client = new DeribitApiClient({
      type: GrantType.client_credentials,
      baseUrl: this.configService.get<string>('deribit.baseUrl')!,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
    });

    this.clients.set(userId, client);
    this.logger.log(`Deribit client created for user ${userId}`);

    await this.waitForSocketOpen(client, timeoutMs);
    return client;
  }

  /**
   * Unwrap a Deribit response: throw BadGatewayException if Deribit returned
   * an error, otherwise return the result value.
   */
  unwrap<T>(response: RequestQuery<T>): T {
    if ('error' in response) {
      throw new BadGatewayException(
        `Deribit error ${response.error.code}: ${response.error.message}`,
      );
    }
    return response.result;
  }

  /**
   * Poll the underlying WebSocket until it reaches OPEN state.
   * Throws GatewayTimeoutException if it does not open within timeoutMs.
   */
  private async waitForSocketOpen(client: DeribitApiClient, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const socket = (client as any).socket as { readyState?: number } | undefined;
      if (socket?.readyState === WS_OPEN) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new GatewayTimeoutException('Deribit WebSocket did not connect within timeout');
  }

  onModuleDestroy() {
    for (const client of this.clients.values()) {
      client.close();
    }
    this.clients.clear();
    this.logger.log('All Deribit clients closed');
  }
}
