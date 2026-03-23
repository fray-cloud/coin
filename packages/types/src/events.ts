import { Ticker, Orderbook } from './exchange';

export interface TickerUpdatedEvent {
  type: 'market.ticker.updated';
  payload: Ticker;
}

export interface OrderbookUpdatedEvent {
  type: 'market.orderbook.updated';
  payload: Orderbook;
}

export type MarketEvent = TickerUpdatedEvent | OrderbookUpdatedEvent;
