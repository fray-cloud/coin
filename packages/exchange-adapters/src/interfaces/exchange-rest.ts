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
  IncomeRecord,
  FundingRateRecord,
  OpenInterestSnapshot,
  OpenInterestPoint,
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
  getIncome(
    credentials: ExchangeCredentials,
    opts: {
      symbol?: string;
      incomeType?: string;
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<IncomeRecord[]>;

  // Public futures market data (no signature required)
  getFundingRateHistory(symbol: string, limit?: number): Promise<FundingRateRecord[]>;
  getCurrentFundingRate(
    symbol: string,
  ): Promise<{ symbol: string; lastFundingRate: string; nextFundingTime: number }>;
  getOpenInterest(symbol: string): Promise<OpenInterestSnapshot>;
  getOpenInterestHistory(
    symbol: string,
    period: '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d',
    limit?: number,
  ): Promise<OpenInterestPoint[]>;
}
