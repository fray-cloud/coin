import {
  ExchangeId,
  ExchangeCredentials,
  Balance,
  OrderRequest,
  OrderResult,
  Market,
  Candle,
} from '@coin/types';

export interface IExchangeRest {
  readonly exchangeId: ExchangeId;
  getBalances(credentials: ExchangeCredentials): Promise<Balance[]>;
  getOpenOrders(credentials: ExchangeCredentials, symbol?: string): Promise<OrderResult[]>;
  placeOrder(credentials: ExchangeCredentials, order: OrderRequest): Promise<OrderResult>;
  cancelOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol?: string,
  ): Promise<OrderResult>;
  getOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol?: string,
  ): Promise<OrderResult>;
  getMarkets(): Promise<Market[]>;
  getCandles(symbol: string, interval: string, limit?: number): Promise<Candle[]>;
}
