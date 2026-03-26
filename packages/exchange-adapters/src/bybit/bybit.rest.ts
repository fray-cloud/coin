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

const BASE_URL = 'https://api.bybit.com';
const RECV_WINDOW = '5000';

export class BybitRest implements IExchangeRest {
  readonly exchangeId = 'bybit' as const;

  async getBalances(credentials: ExchangeCredentials): Promise<Balance[]> {
    const params = { accountType: 'UNIFIED' };
    const res = await this.signedRequest(credentials, 'GET', '/v5/account/wallet-balance', params);
    const data = (await res.json()) as {
      result: {
        list: Array<{
          coin: Array<{
            coin: string;
            availableToWithdraw: string;
            locked: string;
          }>;
        }>;
      };
    };

    const coins = data.result?.list?.[0]?.coin ?? [];
    return coins.map((c) => ({
      exchange: this.exchangeId,
      currency: c.coin,
      free: c.availableToWithdraw,
      locked: c.locked,
    }));
  }

  async getOpenOrders(credentials: ExchangeCredentials, symbol?: string): Promise<OrderResult[]> {
    const params: Record<string, string> = { category: 'spot' };
    if (symbol) params.symbol = symbol;

    const res = await this.signedRequest(credentials, 'GET', '/v5/order/realtime', params);
    const data = (await res.json()) as BybitOrderListResponse;

    return (data.result?.list ?? []).map((o) => this.mapOrder(o));
  }

  async placeOrder(credentials: ExchangeCredentials, order: OrderRequest): Promise<OrderResult> {
    const body: Record<string, string> = {
      category: 'spot',
      symbol: order.symbol,
      side: order.side === 'buy' ? 'Buy' : 'Sell',
      orderType: order.type === 'limit' ? 'Limit' : 'Market',
      qty: order.quantity,
    };

    if (order.type === 'limit') {
      if (order.price) body.price = order.price;
      body.timeInForce = 'GTC';
    }

    const res = await this.signedRequest(credentials, 'POST', '/v5/order/create', {}, body);
    const data = (await res.json()) as {
      result: { orderId: string };
    };

    return {
      exchange: this.exchangeId,
      orderId: data.result.orderId,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      status: 'placed',
      quantity: order.quantity,
      filledQuantity: '0',
      price: order.price ?? '0',
      filledPrice: '0',
      fee: '0',
      feeCurrency: '',
      timestamp: Date.now(),
    };
  }

  async cancelOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol?: string,
  ): Promise<OrderResult> {
    const body: Record<string, string> = {
      category: 'spot',
      orderId,
    };
    if (symbol) body.symbol = symbol;

    const res = await this.signedRequest(credentials, 'POST', '/v5/order/cancel', {}, body);
    const data = (await res.json()) as {
      result: { orderId: string };
    };

    return {
      exchange: this.exchangeId,
      orderId: data.result.orderId,
      symbol: symbol ?? '',
      side: 'buy',
      type: 'limit',
      status: 'cancelled',
      quantity: '0',
      filledQuantity: '0',
      price: '0',
      filledPrice: '0',
      fee: '0',
      feeCurrency: '',
      timestamp: Date.now(),
    };
  }

  async getOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol?: string,
  ): Promise<OrderResult> {
    const params: Record<string, string> = { category: 'spot', orderId };
    if (symbol) params.symbol = symbol;

    const res = await this.signedRequest(credentials, 'GET', '/v5/order/realtime', params);
    const data = (await res.json()) as BybitOrderListResponse;

    const order = data.result?.list?.[0];
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    return this.mapOrder(order);
  }

  async getMarkets(): Promise<Market[]> {
    const url = `${BASE_URL}/v5/market/instruments-info?category=spot`;
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Bybit API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      retCode: number;
      retMsg: string;
      result: {
        list: Array<{
          symbol: string;
          baseCoin: string;
          quoteCoin: string;
          status: string;
        }>;
      };
    };

    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }

    return (data.result?.list ?? [])
      .filter((item) => item.status === 'Trading')
      .map((item) => ({
        exchange: this.exchangeId,
        symbol: item.symbol,
        baseAsset: item.baseCoin,
        quoteAsset: item.quoteCoin,
      }));
  }

  async getCandles(symbol: string, interval: string, limit = 200): Promise<Candle[]> {
    const INTERVAL_MAP: Record<string, string> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '1h': '60',
      '4h': '240',
      '1d': 'D',
    };
    const bybitInterval = INTERVAL_MAP[interval] || '1';
    const res = await fetch(
      `${BASE_URL}/v5/market/kline?category=spot&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`,
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Bybit API error ${res.status}: ${body}`);
    }
    const data = (await res.json()) as {
      retCode: number;
      retMsg: string;
      result: {
        list: Array<[string, string, string, string, string, string, string]>;
      };
    };
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    // Bybit returns newest first, reverse to chronological order
    return (data.result?.list ?? []).reverse().map((k) => ({
      exchange: this.exchangeId,
      symbol,
      interval,
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
      timestamp: Number(k[0]),
    }));
  }

  private mapOrder(o: BybitOrder): OrderResult {
    return {
      exchange: this.exchangeId,
      orderId: o.orderId,
      symbol: o.symbol,
      side: o.side === 'Buy' ? ('buy' as const) : ('sell' as const),
      type: o.orderType === 'Limit' ? ('limit' as const) : ('market' as const),
      status: 'placed' as const,
      quantity: o.qty,
      filledQuantity: o.cumExecQty,
      price: o.price,
      filledPrice: o.avgPrice || '0',
      fee: o.cumExecFee,
      feeCurrency: '',
      timestamp: Number(o.createdTime),
    };
  }

  private async signedRequest(
    credentials: ExchangeCredentials,
    method: string,
    path: string,
    params: Record<string, string> = {},
    body?: Record<string, string>,
  ): Promise<Response> {
    const timestamp = String(Date.now());

    let signPayload: string;
    const headers: Record<string, string> = {
      'X-BAPI-API-KEY': credentials.apiKey,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': RECV_WINDOW,
    };

    let url: string;
    let fetchOptions: RequestInit;

    if (method === 'POST' && body) {
      const bodyString = JSON.stringify(body);
      signPayload = `${timestamp}${credentials.apiKey}${RECV_WINDOW}${bodyString}`;
      headers['Content-Type'] = 'application/json';

      const signature = createHmac('sha256', credentials.secretKey)
        .update(signPayload)
        .digest('hex');
      headers['X-BAPI-SIGN'] = signature;

      url = `${BASE_URL}${path}`;
      fetchOptions = { method, headers, body: bodyString };
    } else {
      const queryString = new URLSearchParams(params).toString();
      signPayload = `${timestamp}${credentials.apiKey}${RECV_WINDOW}${queryString}`;

      const signature = createHmac('sha256', credentials.secretKey)
        .update(signPayload)
        .digest('hex');
      headers['X-BAPI-SIGN'] = signature;

      url = queryString ? `${BASE_URL}${path}?${queryString}` : `${BASE_URL}${path}`;
      fetchOptions = { method, headers };
    }

    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      const responseBody = await res.text();
      throw new Error(`Bybit API error ${res.status}: ${responseBody}`);
    }

    const cloned = res.clone();
    const json = (await cloned.json()) as { retCode: number; retMsg: string };
    if (json.retCode !== 0) {
      throw new Error(`Bybit API error: ${json.retMsg}`);
    }

    return res;
  }
}

interface BybitOrder {
  orderId: string;
  symbol: string;
  side: string;
  orderType: string;
  orderStatus: string;
  qty: string;
  cumExecQty: string;
  price: string;
  avgPrice: string;
  cumExecFee: string;
  createdTime: string;
}

interface BybitOrderListResponse {
  result: {
    list: BybitOrder[];
  };
}
