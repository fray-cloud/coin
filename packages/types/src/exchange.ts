export type ExchangeId = 'upbit' | 'binance' | 'bybit';

export interface ExchangeCredentials {
  apiKey: string;
  secretKey: string;
}

export interface Ticker {
  exchange: ExchangeId;
  symbol: string;
  price: string;
  volume24h: string;
  change24h: string;
  changePercent24h: string;
  high24h: string;
  low24h: string;
  timestamp: number;
}

export interface OrderbookEntry {
  price: string;
  quantity: string;
}

export interface Orderbook {
  exchange: ExchangeId;
  symbol: string;
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  timestamp: number;
}

export interface Candle {
  exchange: ExchangeId;
  symbol: string;
  interval: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  timestamp: number;
}

export interface Balance {
  exchange: ExchangeId;
  currency: string;
  free: string;
  locked: string;
}

export interface OrderRequest {
  exchange: ExchangeId;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  quantity: string;
  price?: string;
}

export interface OrderResult {
  exchange: ExchangeId;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  status: 'pending' | 'placed' | 'filled' | 'partial' | 'cancelled' | 'failed';
  quantity: string;
  filledQuantity: string;
  price: string;
  filledPrice: string;
  fee: string;
  feeCurrency: string;
  timestamp: number;
}

export interface Market {
  exchange: ExchangeId;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}
