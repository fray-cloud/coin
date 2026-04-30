import {
  ExchangeId,
  ExchangeCredentials,
  Balance,
  OrderRequest,
  OrderResult,
  Market,
  Candle,
  Position,
  PositionSide,
  MarginType,
  SymbolFilter,
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
  getCandlesByRange(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]>;

  // Futures-specific
  setLeverage(credentials: ExchangeCredentials, symbol: string, leverage: number): Promise<void>;
  setMarginType(
    credentials: ExchangeCredentials,
    symbol: string,
    marginType: MarginType,
  ): Promise<void>;
  setPositionMode(credentials: ExchangeCredentials, dualSide: boolean): Promise<void>;
  getPosition(credentials: ExchangeCredentials, symbol: string): Promise<Position | null>;
  closePosition(
    credentials: ExchangeCredentials,
    symbol: string,
    side: PositionSide,
    quantity: string,
  ): Promise<OrderResult>;
  placeStopLoss(
    credentials: ExchangeCredentials,
    symbol: string,
    side: PositionSide,
    stopPrice: string,
    quantity: string,
  ): Promise<OrderResult>;
  placeTakeProfit(
    credentials: ExchangeCredentials,
    symbol: string,
    side: PositionSide,
    stopPrice: string,
    quantity: string,
  ): Promise<OrderResult>;
  getSymbolFilter(symbol: string): Promise<SymbolFilter>;
}
