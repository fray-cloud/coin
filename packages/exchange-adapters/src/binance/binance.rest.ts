import { createHmac } from 'crypto';
import {
  ExchangeCredentials,
  Balance,
  OrderRequest,
  OrderResult,
  OrderStatus,
  Market,
  Candle,
  Position,
  PositionSide,
  MarginType,
  SymbolFilter,
} from '@coin/types';
import { IExchangeRest } from '../interfaces/exchange-rest';

const FAPI_MAINNET = 'https://fapi.binance.com';
const FAPI_TESTNET = 'https://testnet.binancefuture.com';

function baseUrl(credentials: ExchangeCredentials): string {
  return credentials.network === 'testnet' ? FAPI_TESTNET : FAPI_MAINNET;
}

function publicBaseUrl(network?: 'mainnet' | 'testnet'): string {
  return network === 'testnet' ? FAPI_TESTNET : FAPI_MAINNET;
}

function parseIntervalMs(interval: string): number {
  const INTERVAL_MS: Record<string, number> = {
    '1m': 60_000,
    '3m': 180_000,
    '5m': 300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '1h': 3_600_000,
    '2h': 7_200_000,
    '4h': 14_400_000,
    '6h': 21_600_000,
    '8h': 28_800_000,
    '12h': 43_200_000,
    '1d': 86_400_000,
  };
  return INTERVAL_MS[interval] ?? 60_000;
}

interface BinanceFuturesOrderResponse {
  orderId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  positionSide?: 'LONG' | 'SHORT' | 'BOTH';
  type: string;
  status: string;
  origQty: string;
  executedQty: string;
  price: string;
  avgPrice?: string;
  stopPrice?: string;
  reduceOnly?: boolean;
  closePosition?: boolean;
  time?: number;
  updateTime?: number;
}

interface BinanceFuturesAlgoOrderResponse {
  algoId: number;
  clientAlgoId?: string;
  algoType: 'CONDITIONAL';
  orderType: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  positionSide?: string;
  algoStatus: string;
  triggerPrice?: string;
  price?: string;
  quantity?: string;
  closePosition?: boolean;
  workingType?: string;
  updateTime?: number;
  createTime?: number;
}

interface BinanceFuturesPositionResponse {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  liquidationPrice: string;
  leverage: string;
  marginType: 'isolated' | 'cross';
  unRealizedProfit: string;
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
}

interface ExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  filters: Array<{
    filterType: string;
    minPrice?: string;
    maxPrice?: string;
    tickSize?: string;
    minQty?: string;
    maxQty?: string;
    stepSize?: string;
    notional?: string;
  }>;
}

export class BinanceRest implements IExchangeRest {
  readonly exchangeId = 'binance' as const;

  private exchangeInfoCache: Map<string, { symbols: ExchangeInfoSymbol[]; ts: number }> = new Map();
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1h

  async getBalances(credentials: ExchangeCredentials): Promise<Balance[]> {
    const res = await this.signedRequest(credentials, 'GET', '/fapi/v2/balance');
    const data = (await res.json()) as Array<{
      asset: string;
      balance: string;
      availableBalance: string;
    }>;

    return data.map((b) => ({
      exchange: this.exchangeId,
      currency: b.asset,
      free: b.availableBalance,
      locked: String(Number(b.balance) - Number(b.availableBalance)),
    }));
  }

  async getOpenOrders(credentials: ExchangeCredentials, symbol?: string): Promise<OrderResult[]> {
    const params: Record<string, string> = {};
    if (symbol) params.symbol = symbol;
    const res = await this.signedRequest(credentials, 'GET', '/fapi/v1/openOrders', params);
    const data = (await res.json()) as BinanceFuturesOrderResponse[];
    return data.map((o) => this.mapOrderResult(o));
  }

  async placeOrder(credentials: ExchangeCredentials, order: OrderRequest): Promise<OrderResult> {
    const params: Record<string, string> = {
      symbol: order.symbol,
      side: order.side === 'long' ? 'BUY' : 'SELL',
      type: order.type.toUpperCase(),
      quantity: order.quantity,
    };

    if (order.type === 'limit') {
      params.timeInForce = 'GTC';
      if (order.price) params.price = order.price;
    }

    const res = await this.signedRequest(credentials, 'POST', '/fapi/v1/order', params);
    const data = (await res.json()) as BinanceFuturesOrderResponse;
    return this.mapOrderResult(data);
  }

  async cancelOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol?: string,
  ): Promise<OrderResult> {
    if (!symbol) throw new Error('symbol required for futures cancelOrder');
    const params: Record<string, string> = { orderId, symbol };
    const res = await this.signedRequest(credentials, 'DELETE', '/fapi/v1/order', params);
    const data = (await res.json()) as BinanceFuturesOrderResponse;
    return this.mapOrderResult(data);
  }

  async getOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol?: string,
  ): Promise<OrderResult> {
    if (!symbol) throw new Error('symbol required for futures getOrder');
    const params: Record<string, string> = { orderId, symbol };
    const res = await this.signedRequest(credentials, 'GET', '/fapi/v1/order', params);
    const data = (await res.json()) as BinanceFuturesOrderResponse;
    return this.mapOrderResult(data);
  }

  async getMarkets(): Promise<Market[]> {
    const info = await this.fetchExchangeInfo();
    return info.symbols
      .filter((s) => s.status === 'TRADING')
      .map((s) => ({
        exchange: this.exchangeId,
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
      }));
  }

  async getCandles(symbol: string, interval: string, limit = 200): Promise<Candle[]> {
    const url = `${publicBaseUrl()}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance fapi error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as Array<unknown[]>;
    return data.map((k) => ({
      exchange: this.exchangeId,
      symbol,
      interval,
      open: String(k[1]),
      high: String(k[2]),
      low: String(k[3]),
      close: String(k[4]),
      volume: String(k[5]),
      timestamp: Number(k[0]),
    }));
  }

  async getCandlesByRange(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]> {
    const PAGE_LIMIT = 1500;
    const intervalMs = parseIntervalMs(interval);
    const allCandles: Candle[] = [];
    let pageStart = startTime;
    const MAX_PAGES = 100;

    for (let page = 0; page < MAX_PAGES; page++) {
      const url = `${publicBaseUrl()}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${PAGE_LIMIT}&startTime=${pageStart}&endTime=${endTime}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Binance fapi error ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as Array<unknown[]>;
      if (data.length === 0) break;

      for (const k of data) {
        allCandles.push({
          exchange: this.exchangeId,
          symbol,
          interval,
          open: String(k[1]),
          high: String(k[2]),
          low: String(k[3]),
          close: String(k[4]),
          volume: String(k[5]),
          timestamp: Number(k[0]),
        });
      }

      if (data.length < PAGE_LIMIT) break;
      pageStart = Number(data[data.length - 1][0]) + intervalMs;
      if (pageStart > endTime) break;
    }

    return allCandles;
  }

  // ── Futures-specific ─────────────────────────────────────────────

  async setLeverage(
    credentials: ExchangeCredentials,
    symbol: string,
    leverage: number,
  ): Promise<void> {
    await this.signedRequest(credentials, 'POST', '/fapi/v1/leverage', {
      symbol,
      leverage: String(leverage),
    });
  }

  async setMarginType(
    credentials: ExchangeCredentials,
    symbol: string,
    marginType: MarginType,
  ): Promise<void> {
    try {
      await this.signedRequest(credentials, 'POST', '/fapi/v1/marginType', {
        symbol,
        marginType,
      });
    } catch (err) {
      // -4046 "No need to change margin type" — idempotent success
      if (err instanceof Error && err.message.includes('-4046')) return;
      throw err;
    }
  }

  async setPositionMode(credentials: ExchangeCredentials, dualSide: boolean): Promise<void> {
    try {
      await this.signedRequest(credentials, 'POST', '/fapi/v1/positionSide/dual', {
        dualSidePosition: String(dualSide),
      });
    } catch (err) {
      // -4059 "No need to change position side" — idempotent success
      if (err instanceof Error && err.message.includes('-4059')) return;
      throw err;
    }
  }

  async getPosition(credentials: ExchangeCredentials, symbol: string): Promise<Position | null> {
    const res = await this.signedRequest(credentials, 'GET', '/fapi/v2/positionRisk', {
      symbol,
    });
    const data = (await res.json()) as BinanceFuturesPositionResponse[];
    const pos = data.find((p) => p.symbol === symbol && Number(p.positionAmt) !== 0);
    if (!pos) return null;
    const qty = Number(pos.positionAmt);
    return {
      exchange: this.exchangeId,
      symbol,
      side: qty > 0 ? 'long' : 'short',
      quantity: String(Math.abs(qty)),
      entryPrice: pos.entryPrice,
      markPrice: pos.markPrice,
      liquidationPrice: pos.liquidationPrice,
      leverage: Number(pos.leverage),
      marginType: pos.marginType === 'cross' ? 'CROSS' : 'ISOLATED',
      unrealizedPnl: pos.unRealizedProfit,
    };
  }

  async closePosition(
    credentials: ExchangeCredentials,
    symbol: string,
    side: PositionSide,
    quantity: string,
  ): Promise<OrderResult> {
    const params: Record<string, string> = {
      symbol,
      side: side === 'long' ? 'SELL' : 'BUY',
      type: 'MARKET',
      quantity,
      reduceOnly: 'true',
    };
    const res = await this.signedRequest(credentials, 'POST', '/fapi/v1/order', params);
    const data = (await res.json()) as BinanceFuturesOrderResponse;
    return this.mapOrderResult(data);
  }

  /**
   * Conditional close orders (STOP_MARKET / TAKE_PROFIT_MARKET) moved to a
   * dedicated endpoint /fapi/v1/algoOrder per Binance's 2025-11-06 mandatory
   * migration. Schema differs from /fapi/v1/order:
   * - `algoType: 'CONDITIONAL'` is required
   * - `stopPrice` is renamed to `triggerPrice`
   * - response carries `algoId` (not `orderId`)
   * `quantity` is accepted but ignored when `closePosition=true` — we keep
   * passing it as a fallback in case Binance changes the contract.
   */
  async placeStopLoss(
    credentials: ExchangeCredentials,
    symbol: string,
    side: PositionSide,
    stopPrice: string,
    quantity: string,
  ): Promise<OrderResult> {
    return this.placeAlgoConditional(credentials, {
      symbol,
      side: side === 'long' ? 'SELL' : 'BUY',
      type: 'STOP_MARKET',
      triggerPrice: stopPrice,
      quantity,
    });
  }

  async placeTakeProfit(
    credentials: ExchangeCredentials,
    symbol: string,
    side: PositionSide,
    stopPrice: string,
    quantity: string,
  ): Promise<OrderResult> {
    return this.placeAlgoConditional(credentials, {
      symbol,
      side: side === 'long' ? 'SELL' : 'BUY',
      type: 'TAKE_PROFIT_MARKET',
      triggerPrice: stopPrice,
      quantity,
    });
  }

  private async placeAlgoConditional(
    credentials: ExchangeCredentials,
    opts: {
      symbol: string;
      side: 'BUY' | 'SELL';
      type: 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
      triggerPrice: string;
      quantity: string;
    },
  ): Promise<OrderResult> {
    const params: Record<string, string> = {
      symbol: opts.symbol,
      side: opts.side,
      type: opts.type,
      algoType: 'CONDITIONAL',
      triggerPrice: opts.triggerPrice,
      closePosition: 'true',
      workingType: 'MARK_PRICE',
    };
    const res = await this.signedRequest(credentials, 'POST', '/fapi/v1/algoOrder', params);
    const data = (await res.json()) as BinanceFuturesAlgoOrderResponse;
    return {
      exchange: this.exchangeId,
      orderId: String(data.algoId),
      symbol: data.symbol,
      side: opts.side === 'BUY' ? 'long' : 'short',
      type: 'market',
      status: this.mapOrderStatus(data.algoStatus),
      quantity: opts.quantity,
      filledQuantity: '0',
      price: data.triggerPrice ?? '0',
      filledPrice: '0',
      fee: '0',
      feeCurrency: '',
      timestamp: data.updateTime ?? Date.now(),
    };
  }

  async getSymbolFilter(symbol: string): Promise<SymbolFilter> {
    const info = await this.fetchExchangeInfo();
    const sym = info.symbols.find((s) => s.symbol === symbol);
    if (!sym) throw new Error(`Symbol not found in exchangeInfo: ${symbol}`);
    const lotSize = sym.filters.find((f) => f.filterType === 'LOT_SIZE');
    const priceFilter = sym.filters.find((f) => f.filterType === 'PRICE_FILTER');
    const minNotional = sym.filters.find((f) => f.filterType === 'MIN_NOTIONAL');
    return {
      symbol,
      pricePrecision: sym.pricePrecision,
      quantityPrecision: sym.quantityPrecision,
      minQty: lotSize?.minQty ?? '0',
      stepSize: lotSize?.stepSize ?? '0',
      minNotional: minNotional?.notional ?? '0',
      tickSize: priceFilter?.tickSize ?? '0',
    };
  }

  // ── Internal ─────────────────────────────────────────────────────

  private async fetchExchangeInfo(network: 'mainnet' | 'testnet' = 'mainnet') {
    const cacheKey = network;
    const cached = this.exchangeInfoCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts < BinanceRest.CACHE_TTL_MS) {
      return { symbols: cached.symbols };
    }
    const url = `${publicBaseUrl(network)}/fapi/v1/exchangeInfo`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance fapi exchangeInfo error ${res.status}`);
    const data = (await res.json()) as { symbols: ExchangeInfoSymbol[] };
    this.exchangeInfoCache.set(cacheKey, { symbols: data.symbols, ts: now });
    return data;
  }

  private mapOrderResult(o: BinanceFuturesOrderResponse): OrderResult {
    const side: PositionSide = o.positionSide === 'SHORT' || o.side === 'SELL' ? 'short' : 'long';
    return {
      exchange: this.exchangeId,
      orderId: String(o.orderId),
      symbol: o.symbol,
      side,
      type: o.type === 'LIMIT' ? 'limit' : 'market',
      status: this.mapOrderStatus(o.status),
      quantity: o.origQty,
      filledQuantity: o.executedQty,
      price: o.price,
      filledPrice: o.avgPrice ?? '0',
      fee: '0',
      feeCurrency: '',
      timestamp: o.updateTime ?? o.time ?? Date.now(),
    };
  }

  private mapOrderStatus(status: string): OrderStatus {
    switch (status) {
      case 'NEW':
        return 'placed';
      case 'PARTIALLY_FILLED':
        return 'partial';
      case 'FILLED':
        return 'filled';
      case 'CANCELED':
      case 'EXPIRED':
        return 'cancelled';
      case 'REJECTED':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private async signedRequest(
    credentials: ExchangeCredentials,
    method: string,
    path: string,
    extraParams: Record<string, string> = {},
  ): Promise<Response> {
    const params = new URLSearchParams({
      ...extraParams,
      timestamp: String(Date.now()),
      recvWindow: '5000',
    });

    const signature = createHmac('sha256', credentials.secretKey)
      .update(params.toString())
      .digest('hex');
    params.append('signature', signature);

    const headers: Record<string, string> = {
      'X-MBX-APIKEY': credentials.apiKey,
    };
    const init: RequestInit = { method, headers };

    let url: string;
    if (method === 'POST') {
      url = `${baseUrl(credentials)}${path}`;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      init.body = params.toString();
    } else {
      url = `${baseUrl(credentials)}${path}?${params.toString()}`;
    }

    const res = await fetch(url, init);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Binance fapi error ${res.status}: ${body}`);
    }
    return res;
  }
}
