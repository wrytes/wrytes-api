import { Injectable, Logger } from '@nestjs/common';
import { KrakenClient } from './kraken.client';
import {
  DepositMethodsRequest,
  DepositMethodsResponse,
  DepositAddressesRequest,
  DepositAddressesResponse,
  DepositStatusRequest,
  DepositStatusResponse,
} from './kraken.types';

@Injectable()
export class KrakenDeposit {
  private readonly logger = new Logger(KrakenDeposit.name);

  constructor(private readonly client: KrakenClient) {}

  /** Get available deposit methods for an asset. */
  async getMethods(data: DepositMethodsRequest): Promise<DepositMethodsResponse> {
    const res = await this.client.request({
      method: 'POST',
      path: '/0/private/DepositMethods',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<DepositMethodsResponse>;
  }

  /** Get deposit addresses for an asset and method. Pass `new: true` to generate a fresh address. */
  async getAddresses(data: DepositAddressesRequest): Promise<DepositAddressesResponse> {
    const res = await this.client.request({
      method: 'POST',
      path: '/0/private/DepositAddresses',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<DepositAddressesResponse>;
  }

  /** Get status of recent deposits. */
  async getStatus(data: DepositStatusRequest): Promise<DepositStatusResponse> {
    const res = await this.client.request({
      method: 'POST',
      path: '/0/private/DepositStatus',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<DepositStatusResponse>;
  }
}
