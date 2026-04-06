import { createHmac } from 'crypto';
import {
  ExchangeCredentials,
  Balance,
  OrderRequest,
  OrderResult,
  Market,
  Candle,
} from '@coin/types';
import { IExchangeRest } from '../interfaces/exchange-rest';

const BASE_URL = 'https://api.binance.com';

function parseIntervalMs(interval: string): number {
  const INTERVAL_MS: Record<string, number> = {
    '1m': 60_000,
    '5m': 300_000,
    '15m': 900_000,
    '1h': 3_600_000,
    '4h': 14_400_000,
    '1d': 86_400_000,
  };
  return INTERVAL_MS[interval] ?? 60_000;
}

interface BinanceOrderResponse {
  orderId: number;
  symbol: string;
  side: string;
  type: string;
  status: string;
  origQty: string;
  executedQty: string;
  price: string;
  time?: number;
  transactTime?: number;
}

export class BinanceRest implements IExchangeRest {
  readonly exchangeId = 'binance' as const;

  async getBalances(credentials: ExchangeCredentials): Promise<Balance[]> {
    const res = await this.signedRequest(credentials, 'GET', '/api/v3/account');
    const data = (await res.json()) as {
      balances: Array<{ asset: string; free: string; locked: string }>;
    };

    return data.balances.map((b) => ({
      exchange: this.exchangeId,
      currency: b.asset,
      free: b.free,
      locked: b.locked,
    }));
  }

  async getOpenOrders(credentials: ExchangeCredentials, symbol?: string): Promise<OrderResult[]> {
    const params: Record<string, string> = {};
    if (symbol) params.symbol = symbol;

    const res = await this.signedRequest(credentials, 'GET', '/api/v3/openOrders', params);
    const data = (await res.json()) as BinanceOrderResponse[];

    return data.map((o) => this.mapOrderResult(o));
  }

  async placeOrder(credentials: ExchangeCredentials, order: OrderRequest): Promise<OrderResult> {
    const params: Record<string, string> = {
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      type: order.type.toUpperCase(),
      quantity: order.quantity,
    };

    if (order.type === 'limit') {
      params.timeInForce = 'GTC';
      if (order.price) {
        params.price = order.price;
      }
    }

    const res = await this.signedRequest(credentials, 'POST', '/api/v3/order', params);
    const data = (await res.json()) as BinanceOrderResponse;

    return this.mapOrderResult(data);
  }

  async cancelOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol?: string,
  ): Promise<OrderResult> {
    const params: Record<string, string> = {
      orderId,
    };
    if (symbol) params.symbol = symbol;

    const res = await this.signedRequest(credentials, 'DELETE', '/api/v3/order', params);
    const data = (await res.json()) as BinanceOrderResponse;

    return this.mapOrderResult(data);
  }

  async getOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol?: string,
  ): Promise<OrderResult> {
    const params: Record<string, string> = {
      orderId,
    };
    if (symbol) params.symbol = symbol;

    const res = await this.signedRequest(credentials, 'GET', '/api/v3/order', params);
    const data = (await res.json()) as BinanceOrderResponse;

    return this.mapOrderResult(data);
  }

  async getMarkets(): Promise<Market[]> {
    const res = await fetch(`${BASE_URL}/api/v3/exchangeInfo`);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Binance API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      symbols: Array<{
        symbol: string;
        baseAsset: string;
        quoteAsset: string;
        status: string;
      }>;
    };

    return data.symbols
      .filter((s) => s.status === 'TRADING')
      .map((s) => ({
        exchange: this.exchangeId,
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
      }));
  }

  async getCandles(symbol: string, interval: string, limit = 200): Promise<Candle[]> {
    const res = await fetch(
      `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Binance API error ${res.status}: ${body}`);
    }
    const data = (await res.json()) as Array<
      [
        number,
        string,
        string,
        string,
        string,
        string,
        number,
        string,
        number,
        string,
        string,
        string,
      ]
    >;
    return data.map((k) => ({
      exchange: this.exchangeId,
      symbol,
      interval,
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
      timestamp: k[0],
    }));
  }

  async getCandlesByRange(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]> {
    const PAGE_LIMIT = 1000;
    const intervalMs = parseIntervalMs(interval);
    const allCandles: Candle[] = [];
    let pageStart = startTime;
    const MAX_PAGES = 100;

    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await fetch(
        `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${PAGE_LIMIT}&startTime=${pageStart}&endTime=${endTime}`,
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Binance API error ${res.status}: ${body}`);
      }
      const data = (await res.json()) as Array<
        [
          number,
          string,
          string,
          string,
          string,
          string,
          number,
          string,
          number,
          string,
          string,
          string,
        ]
      >;
      if (data.length === 0) break;

      for (const k of data) {
        allCandles.push({
          exchange: this.exchangeId,
          symbol,
          interval,
          open: k[1],
          high: k[2],
          low: k[3],
          close: k[4],
          volume: k[5],
          timestamp: k[0],
        });
      }

      if (data.length < PAGE_LIMIT) break;
      pageStart = data[data.length - 1][0] + intervalMs;
      if (pageStart > endTime) break;
    }

    return allCandles;
  }

  private mapOrderResult(o: BinanceOrderResponse): OrderResult {
    return {
      exchange: this.exchangeId,
      orderId: String(o.orderId),
      symbol: o.symbol,
      side: o.side.toLowerCase() as 'buy' | 'sell',
      type: o.type === 'LIMIT' ? ('limit' as const) : ('market' as const),
      status: this.mapOrderStatus(o.status),
      quantity: o.origQty,
      filledQuantity: o.executedQty,
      price: o.price,
      filledPrice: '0',
      fee: '0',
      feeCurrency: '',
      timestamp: o.transactTime ?? o.time ?? Date.now(),
    };
  }

  private mapOrderStatus(
    status: string,
  ): 'pending' | 'placed' | 'filled' | 'partial' | 'cancelled' | 'failed' {
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

    let url: string;
    const headers: Record<string, string> = {
      'X-MBX-APIKEY': credentials.apiKey,
    };
    const init: RequestInit = { method, headers };

    if (method === 'POST') {
      url = `${BASE_URL}${path}`;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      init.body = params.toString();
    } else {
      // GET and DELETE use query params
      url = `${BASE_URL}${path}?${params.toString()}`;
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Binance API error ${res.status}: ${body}`);
    }

    return res;
  }
}
