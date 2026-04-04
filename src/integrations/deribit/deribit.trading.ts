import { Injectable, Logger } from '@nestjs/common';
import {
  Currency,
  OrderType,
  TimeInForce,
  TradingBuyResult,
  TradingCancelResult,
  TradingGetOpenOrdersByCurrencyResult,
  TradingGetOpenOrdersByInstrumentResult,
  TradingGetOrderStateResult,
  TradingSellResult,
} from '@wrytes/deribit-api-client';
import { DeribitClientService } from './deribit.client.service';

export type PlaceOrderParams = {
  instrument_name: string;
  amount: number;
  type: OrderType;
  price?: number;
  label?: string;
  time_in_force?: TimeInForce;
  reduce_only?: boolean;
  post_only?: boolean;
};

@Injectable()
export class DeribitTrading {
  private readonly logger = new Logger(DeribitTrading.name);

  constructor(private readonly client: DeribitClientService) {}

  async buy(params: PlaceOrderParams): Promise<TradingBuyResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.trading.buy(params));
  }

  async sell(params: PlaceOrderParams): Promise<TradingSellResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.trading.sell(params));
  }

  async cancel(order_id: string): Promise<TradingCancelResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.trading.cancel({ order_id }));
  }

  async getOpenOrdersByCurrency(currency: Currency): Promise<TradingGetOpenOrdersByCurrencyResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.trading.getOpenOrdersByCurrency({ currency }));
  }

  async getOpenOrdersByInstrument(instrument_name: string): Promise<TradingGetOpenOrdersByInstrumentResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.trading.getOpenOrdersByInstrument({ instrument_name }));
  }

  async getOrderState(order_id: string): Promise<TradingGetOrderStateResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.trading.getOrderState({ order_id }));
  }

  /** Place a buy order and poll until it is no longer open. Returns the final order state. */
  async buyAndWait(params: PlaceOrderParams): Promise<TradingGetOrderStateResult> {
    const result = await this.buy(params);
    this.logger.log(`Buy order placed: ${result.order.order_id} (${params.instrument_name})`);
    return this.waitForOrderSettled(result.order.order_id);
  }

  /** Place a sell order and poll until it is no longer open. Returns the final order state. */
  async sellAndWait(params: PlaceOrderParams): Promise<TradingGetOrderStateResult> {
    const result = await this.sell(params);
    this.logger.log(`Sell order placed: ${result.order.order_id} (${params.instrument_name})`);
    return this.waitForOrderSettled(result.order.order_id);
  }

  /** Poll until the order is filled, rejected, or cancelled. */
  private waitForOrderSettled(order_id: string): Promise<TradingGetOrderStateResult> {
    return new Promise((resolve, reject) => {
      const handle = setInterval(async () => {
        try {
          const state = await this.getOrderState(order_id);
          if (state.order_state === 'open') {
            this.logger.log(`Order ${order_id}: waiting for settlement...`);
            return;
          }
          clearInterval(handle);
          resolve(state);
        } catch (err) {
          clearInterval(handle);
          reject(err);
        }
      }, 1_000);
    });
  }
}
