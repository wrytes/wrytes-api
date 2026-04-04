import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeribitApiClient, GrantType, RequestQuery } from '@wrytes/deribit-api-client';

const WS_OPEN = 1; // WebSocket.OPEN

@Injectable()
export class DeribitClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeribitClientService.name);
  private client: DeribitApiClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const clientId = this.configService.get<string>('deribit.clientId');
    const clientSecret = this.configService.get<string>('deribit.clientSecret');

    if (!clientId || !clientSecret) {
      this.logger.warn('DERIBIT_CLIENT_ID / DERIBIT_CLIENT_SECRET not set — Deribit endpoints will fail');
      return;
    }

    this.client = new DeribitApiClient({
      type: GrantType.client_credentials,
      baseUrl: this.configService.get<string>('deribit.baseUrl')!,
      clientId,
      clientSecret,
    });

    this.logger.log(`Deribit client connecting to ${this.configService.get('deribit.baseUrl')}`);
  }

  async getClient(timeoutMs = 8000): Promise<DeribitApiClient> {
    if (!this.client) {
      const clientId = this.configService.get<string>('deribit.clientId');
      const clientSecret = this.configService.get<string>('deribit.clientSecret');

      if (!clientId || !clientSecret) {
        throw new BadGatewayException('Deribit credentials not configured');
      }

      this.client = new DeribitApiClient({
        type: GrantType.client_credentials,
        baseUrl: this.configService.get<string>('deribit.baseUrl')!,
        clientId,
        clientSecret,
      });
    }

    await this.waitForSocketOpen(this.client, timeoutMs);
    return this.client;
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
    this.client?.close();
    this.client = null;
    this.logger.log('Deribit client closed');
  }
}
