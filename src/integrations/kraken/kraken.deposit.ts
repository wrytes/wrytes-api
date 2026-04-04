import { Injectable } from '@nestjs/common';
import { KrakenClientFactory } from './kraken.factory';
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
  constructor(private readonly factory: KrakenClientFactory) {}

  async getMethods(userId: string, data: DepositMethodsRequest): Promise<DepositMethodsResponse> {
    const client = await this.factory.forUser(userId);
    const res = await client.request({
      method: 'POST',
      path: '/0/private/DepositMethods',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<DepositMethodsResponse>;
  }

  async getAddresses(userId: string, data: DepositAddressesRequest): Promise<DepositAddressesResponse> {
    const client = await this.factory.forUser(userId);
    const res = await client.request({
      method: 'POST',
      path: '/0/private/DepositAddresses',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<DepositAddressesResponse>;
  }

  async getStatus(userId: string, data: DepositStatusRequest): Promise<DepositStatusResponse> {
    const client = await this.factory.forUser(userId);
    const res = await client.request({
      method: 'POST',
      path: '/0/private/DepositStatus',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<DepositStatusResponse>;
  }
}
