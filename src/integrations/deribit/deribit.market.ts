import { Injectable } from '@nestjs/common';
import {
  Currency,
  MarketGetBookSummaryByCurrencyResult,
  MarketGetBookSummaryByInstrumentResult,
  MarketGetCurrenciesResult,
  MarketGetDeliveryPricesNames,
  MarketGetDeliveryPricesResult,
  MarketGetIndexPriceResult,
  MarketGetInstrumentsResult,
  MarketGetVolatilityIndexDataResult,
} from '@wrytes/deribit-api-client';
import { DeribitClientService } from './deribit.client.service';

type InstrumentKind = 'future' | 'option' | 'spot' | 'future_combo' | 'option_combo';

@Injectable()
export class DeribitMarket {
  constructor(private readonly client: DeribitClientService) {}

  async getCurrencies(): Promise<MarketGetCurrenciesResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.market.getCurrencies({}));
  }

  async getIndexPrice(index_name: string): Promise<MarketGetIndexPriceResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.market.getIndexPrice({ index_name }));
  }

  async getInstruments(
    currency: Currency,
    kind?: InstrumentKind,
    expired?: boolean,
  ): Promise<MarketGetInstrumentsResult[]> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.market.getInstruments({ currency, kind, expired }));
  }

  async getBookSummaryByCurrency(currency: Currency): Promise<MarketGetBookSummaryByCurrencyResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.market.getBookSummaryByCurrency({ currency }));
  }

  async getBookSummaryByInstrument(instrument_name: string): Promise<MarketGetBookSummaryByInstrumentResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.market.getBookSummaryByInstrument({ instrument_name }));
  }

  async getDeliveryPrices(index_name: MarketGetDeliveryPricesNames): Promise<MarketGetDeliveryPricesResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(await c.market.getDeliveryPrices({ index_name }));
  }

  async getVolatilityIndexData(
    currency: string,
    start_timestamp: number,
    end_timestamp: number,
    resolution: string,
  ): Promise<MarketGetVolatilityIndexDataResult> {
    const c = await this.client.getClient();
    return this.client.unwrap(
      await c.market.getVolatilityIndexData({ currency, start_timestamp, end_timestamp, resolution }),
    );
  }
}
