import { Injectable, Logger } from '@nestjs/common';
import { KrakenClientFactory } from './kraken.factory';
import {
  OpenOrdersResponse,
  AddOrderRequest,
  AddOrderResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  GetOrderInfoRequest,
  GetOrderInfoResponse,
  OpenOrder,
} from './kraken.types';

@Injectable()
export class KrakenOrders {
  private readonly logger = new Logger(KrakenOrders.name);

  constructor(private readonly factory: KrakenClientFactory) {}

  async getOpenOrders(userId: string): Promise<OpenOrdersResponse> {
    const client = await this.factory.forUser(userId);
    const res = await client.request({ method: 'POST', path: '/0/private/OpenOrders' });
    return res.json() as Promise<OpenOrdersResponse>;
  }

  async addOrder(userId: string, data: AddOrderRequest): Promise<AddOrderResponse> {
    const client = await this.factory.forUser(userId);
    const res = await client.request({
      method: 'POST',
      path: '/0/private/AddOrder',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<AddOrderResponse>;
  }

  async cancelOrder(userId: string, data: CancelOrderRequest): Promise<CancelOrderResponse> {
    const client = await this.factory.forUser(userId);
    const res = await client.request({
      method: 'POST',
      path: '/0/private/CancelOrder',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<CancelOrderResponse>;
  }

  async getOrderInfo(userId: string, data: GetOrderInfoRequest): Promise<GetOrderInfoResponse> {
    const client = await this.factory.forUser(userId);
    const res = await client.request({
      method: 'POST',
      path: '/0/private/QueryOrders',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<GetOrderInfoResponse>;
  }

  /** Poll until the order is no longer open, then return final order info. */
  waitForOrderSettled(userId: string, orderId: string): Promise<OpenOrder> {
    return new Promise((resolve, reject) => {
      const handle = setInterval(async () => {
        try {
          const openOrders = await this.getOpenOrders(userId);
          if (orderId in openOrders.result.open) {
            this.logger.log(`Order ${orderId}: waiting for settlement...`);
            return;
          }
          clearInterval(handle);
          const info = await this.getOrderInfo(userId, { txid: orderId });
          resolve(info.result[orderId]);
        } catch (err) {
          clearInterval(handle);
          reject(err);
        }
      }, 1_000);
    });
  }

  /** Place an order and wait for it to settle. Returns the final order state. */
  async placeAndWait(userId: string, data: AddOrderRequest): Promise<OpenOrder> {
    const order = await this.addOrder(userId, data);
    const orderId = order.result.txid[0];
    this.logger.log(`Order placed: ${order.result.descr.order} (${orderId})`);
    return this.waitForOrderSettled(userId, orderId);
  }
}
