export type ExchangeId = 'binance';

export type Network = 'mainnet' | 'testnet';

export interface ExchangeCredentials {
  apiKey: string;
  secretKey: string;
  network?: Network;
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

export type PositionSide = 'long' | 'short';
export type MarginType = 'ISOLATED' | 'CROSS';

/**
 * Futures order request. `side` is the user-facing position direction
 * (long/short). The adapter translates to Binance's internal BUY/SELL.
 *
 * For closing an existing position use closePosition() on the adapter,
 * not placeOrder().
 */
export interface OrderRequest {
  exchange: ExchangeId;
  symbol: string;
  side: PositionSide;
  type: 'market' | 'limit';
  quantity: string;
  price?: string;
  leverage: number;
  marginType?: MarginType;
  takeProfitPrice?: string;
  stopLossPrice?: string;
}

export type OrderStatus = 'pending' | 'placed' | 'filled' | 'partial' | 'cancelled' | 'failed';

export interface OrderResult {
  exchange: ExchangeId;
  orderId: string;
  symbol: string;
  side: PositionSide;
  type: 'market' | 'limit';
  status: OrderStatus;
  quantity: string;
  filledQuantity: string;
  price: string;
  filledPrice: string;
  fee: string;
  feeCurrency: string;
  timestamp: number;
  entryPrice?: string;
  liquidationPrice?: string;
  leverage?: number;
  tpOrderId?: string;
  slOrderId?: string;
}

export interface Position {
  exchange: ExchangeId;
  symbol: string;
  side: PositionSide;
  quantity: string;
  entryPrice: string;
  markPrice: string;
  liquidationPrice: string;
  leverage: number;
  marginType: MarginType;
  unrealizedPnl: string;
}

export interface Market {
  exchange: ExchangeId;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

export interface SymbolFilter {
  symbol: string;
  pricePrecision: number;
  quantityPrecision: number;
  minQty: string;
  stepSize: string;
  minNotional: string;
  tickSize: string;
}

export type IncomeType =
  | 'REALIZED_PNL'
  | 'COMMISSION'
  | 'FUNDING_FEE'
  | 'INSURANCE_CLEAR'
  | 'TRANSFER'
  | 'WELCOME_BONUS'
  | 'REFERRAL_KICKBACK'
  | 'COMMISSION_REBATE'
  | 'API_REBATE'
  | 'CONTEST_REWARD'
  | 'CROSS_COLLATERAL_TRANSFER'
  | 'OPTIONS_PREMIUM_FEE'
  | 'OPTIONS_SETTLE_PROFIT'
  | 'INTERNAL_TRANSFER'
  | 'AUTO_EXCHANGE'
  | 'DELIVERED_SETTELMENT'
  | 'COIN_SWAP_DEPOSIT'
  | 'COIN_SWAP_WITHDRAW'
  | 'POSITION_LIMIT_INCREASE_FEE';

export interface IncomeRecord {
  symbol?: string;
  incomeType: IncomeType | string;
  income: string;
  asset: string;
  time: number;
  tradeId?: string;
  tranId?: string;
  info?: string;
}

// ── Futures sentiment ────────────────────────────────────────────────

export interface FundingRateRecord {
  symbol: string;
  fundingTime: number;
  fundingRate: string;
}

export interface OpenInterestSnapshot {
  symbol: string;
  /** OI in coin units (Binance USDT-M `openInterest` field). */
  openInterest: string;
  timestamp: number;
}

export interface OpenInterestPoint {
  symbol: string;
  /** Coin-denominated OI (`sumOpenInterest` from openInterestHist). */
  sumOpenInterest: string;
  /** USDT-denominated OI value (`sumOpenInterestValue` from openInterestHist). */
  sumOpenInterestValueUsdt: string;
  timestamp: number;
}

// ── Indicators (computed by @coin/indicators) ────────────────────────

/** One row aligned with one OHLCV candle. Indicator values are `null`
 * during the warmup period (when there isn't enough prior data to compute
 * the value reliably). */
export interface IndicatorRow {
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi14: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  atr14: number | null;
}

export interface IndicatorSeries {
  /** Same length as the input candles array. `rows[i]` corresponds to candles[i]. */
  rows: IndicatorRow[];
}
