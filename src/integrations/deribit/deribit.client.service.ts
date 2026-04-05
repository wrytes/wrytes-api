import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeribitApiClient, GrantType, RequestQuery } from '@wrytes/deribit-api-client';

const WS_OPEN = 1; // WebSocket.OPEN

@Injectable()
export class DeribitClientService implements OnModuleDestroy {
  private readonly logger = new Logger(DeribitClientService.name);
  private operatorClient: DeribitApiClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getClient(): Promise<DeribitApiClient> {
    if (!this.operatorClient) {
      this.operatorClient = new DeribitApiClient({
        type: GrantType.client_credentials,
        baseUrl: this.configService.get<string>('deribit.baseUrl')!,
        clientId: this.configService.get<string>('deribit.clientId')!,
        clientSecret: this.configService.get<string>('deribit.clientSecret')!,
      });
      this.logger.log('Deribit operator client created');
    }

    await this.waitForSocketOpen(this.operatorClient, 8000);
    return this.operatorClient;
  }

  /** @deprecated use getClient() — kept for call-site compatibility during migration */
  getClientForUser(_userId: string): Promise<DeribitApiClient> {
    return this.getClient();
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
    this.operatorClient?.close();
    this.operatorClient = null;
    this.logger.log('Deribit operator client closed');
  }
}
