import { Injectable, Logger } from '@nestjs/common';
import { KrakenClient } from './kraken.client';
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

  constructor(private readonly client: KrakenClient) {}

  async getOpenOrders(): Promise<OpenOrdersResponse> {
    const res = await this.client.request({ method: 'POST', path: '/0/private/OpenOrders' });
    return res.json() as Promise<OpenOrdersResponse>;
  }

  async addOrder(data: AddOrderRequest): Promise<AddOrderResponse> {
    const res = await this.client.request({
      method: 'POST',
      path: '/0/private/AddOrder',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<AddOrderResponse>;
  }

  async cancelOrder(data: CancelOrderRequest): Promise<CancelOrderResponse> {
    const res = await this.client.request({
      method: 'POST',
      path: '/0/private/CancelOrder',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<CancelOrderResponse>;
  }

  async getOrderInfo(data: GetOrderInfoRequest): Promise<GetOrderInfoResponse> {
    const res = await this.client.request({
      method: 'POST',
      path: '/0/private/QueryOrders',
      body: data as Record<string, any>,
    });
    return res.json() as Promise<GetOrderInfoResponse>;
  }

  /** Poll until the order is no longer open, then return final order info. */
  waitForOrderSettled(orderId: string): Promise<OpenOrder> {
    return new Promise((resolve, reject) => {
      const handle = setInterval(async () => {
        try {
          const openOrders = await this.getOpenOrders();
          if (orderId in openOrders.result.open) {
            this.logger.log(`Order ${orderId}: waiting for settlement...`);
            return;
          }
          clearInterval(handle);
          const info = await this.getOrderInfo({ txid: orderId });
          resolve(info.result[orderId]);
        } catch (err) {
          clearInterval(handle);
          reject(err);
        }
      }, 1_000);
    });
  }

  /** Place an order and wait for it to settle. Returns the final order state. */
  async placeAndWait(data: AddOrderRequest): Promise<OpenOrder> {
    const order = await this.addOrder(data);
    const orderId = order.result.txid[0];
    this.logger.log(`Order placed: ${order.result.descr.order} (${orderId})`);
    return this.waitForOrderSettled(orderId);
  }
}
