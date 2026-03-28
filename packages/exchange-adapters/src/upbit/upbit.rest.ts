import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import type {
  ExchangeCredentials,
  Balance,
  OrderResult,
  OrderRequest,
  Market,
  Candle,
} from '@coin/types';
import { IExchangeRest } from '../interfaces/exchange-rest';

const BASE_URL = 'https://api.upbit.com';

interface UpbitTrade {
  market: string;
  uuid: string;
  price: string;
  volume: string;
  funds: string;
  trend: string;
  side: string;
  created_at: string;
}

interface UpbitOrderResponse {
  uuid: string;
  side: string;
  ord_type: string;
  price: string | null;
  state: string;
  market: string;
  volume: string | null;
  remaining_volume: string | null;
  executed_volume: string;
  executed_funds?: string;
  trades_count: number;
  created_at: string;
  paid_fee?: string;
  trades?: UpbitTrade[];
}

export class UpbitRest implements IExchangeRest {
  readonly exchangeId = 'upbit' as const;

  async getBalances(credentials: ExchangeCredentials): Promise<Balance[]> {
    const res = await this.request(credentials, 'GET', '/v1/accounts');
    const data = (await res.json()) as Array<{
      currency: string;
      balance: string;
      locked: string;
    }>;

    return data.map((item) => ({
      exchange: this.exchangeId,
      currency: item.currency,
      free: item.balance,
      locked: item.locked,
    }));
  }

  async getOpenOrders(credentials: ExchangeCredentials): Promise<OrderResult[]> {
    const query = 'state=wait';
    const res = await this.request(credentials, 'GET', `/v1/orders?${query}`, query);
    const data = (await res.json()) as UpbitOrderResponse[];

    return data.map((o) => this.mapOrderResponse(o));
  }

  async placeOrder(credentials: ExchangeCredentials, order: OrderRequest): Promise<OrderResult> {
    const body: Record<string, string> = {
      market: order.symbol,
      side: order.side === 'buy' ? 'bid' : 'ask',
      ord_type: 'limit',
    };

    if (order.type === 'market' && order.side === 'buy') {
      // Market buy: Upbit requires KRW amount in 'price' field, not coin quantity.
      // If price is provided, use it directly as KRW amount.
      // Otherwise, use quantity as KRW amount (caller should convert quantity * currentPrice).
      body.ord_type = 'price';
      body.price = order.price || order.quantity;
    } else if (order.type === 'market' && order.side === 'sell') {
      // Market sell: specify volume, no price
      body.ord_type = 'market';
      body.volume = order.quantity;
    } else {
      // Limit order: both volume and price
      body.ord_type = 'limit';
      body.volume = order.quantity;
      body.price = order.price!;
    }

    const res = await this.request(credentials, 'POST', '/v1/orders', undefined, body);
    const data = (await res.json()) as UpbitOrderResponse;

    return this.mapOrderResponse(data);
  }

  async cancelOrder(credentials: ExchangeCredentials, orderId: string): Promise<OrderResult> {
    const query = `uuid=${orderId}`;
    const res = await this.request(credentials, 'DELETE', `/v1/order?${query}`, query);
    const data = (await res.json()) as UpbitOrderResponse;

    return this.mapOrderResponse(data);
  }

  async getOrder(credentials: ExchangeCredentials, orderId: string): Promise<OrderResult> {
    const query = `uuid=${orderId}`;
    const res = await this.request(credentials, 'GET', `/v1/order?${query}`, query);
    const data = (await res.json()) as UpbitOrderResponse;

    return this.mapOrderResponse(data);
  }

  async getMarkets(): Promise<Market[]> {
    const res = await fetch(`${BASE_URL}/v1/market/all?is_details=false`);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Upbit API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as Array<{
      market: string;
      korean_name: string;
      english_name: string;
    }>;

    return data.map((item) => {
      const [quoteAsset, baseAsset] = item.market.split('-');
      return {
        exchange: this.exchangeId,
        symbol: item.market,
        baseAsset,
        quoteAsset,
      };
    });
  }

  async getCandles(symbol: string, interval: string, limit = 200): Promise<Candle[]> {
    const INTERVAL_MAP: Record<string, string> = {
      '1m': 'minutes/1',
      '5m': 'minutes/5',
      '15m': 'minutes/15',
      '1h': 'minutes/60',
      '4h': 'minutes/240',
      '1d': 'days',
    };
    const path = INTERVAL_MAP[interval] || 'minutes/1';
    const res = await fetch(`${BASE_URL}/v1/candles/${path}?market=${symbol}&count=${limit}`);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Upbit API error ${res.status}: ${body}`);
    }
    const data = (await res.json()) as Array<{
      candle_date_time_utc: string;
      opening_price: number;
      high_price: number;
      low_price: number;
      trade_price: number;
      candle_acc_trade_volume: number;
      timestamp: number;
    }>;
    // Upbit returns newest first, reverse to chronological order
    return data.reverse().map((k) => ({
      exchange: this.exchangeId,
      symbol,
      interval,
      open: String(k.opening_price),
      high: String(k.high_price),
      low: String(k.low_price),
      close: String(k.trade_price),
      volume: String(k.candle_acc_trade_volume),
      timestamp: k.timestamp,
    }));
  }

  private mapOrderResponse(o: UpbitOrderResponse): OrderResult {
    const execVol = parseFloat(o.executed_volume);

    // Upbit market buy (ord_type: 'price') ends with state 'cancel' even when
    // fully executed — the remaining KRW budget is returned and order is cancelled.
    // Treat cancel with executed_volume > 0 as filled.
    let status: OrderResult['status'];
    if (o.state === 'done' || (o.state === 'cancel' && execVol > 0)) {
      status = 'filled';
    } else if (o.state === 'wait' || o.state === 'watch') {
      status = 'placed';
    } else if (o.state === 'cancel') {
      status = 'cancelled';
    } else {
      status = 'pending';
    }

    // Calculate average filled price: prefer executed_funds, fallback to trades
    let filledPrice = '0';
    const execFunds = parseFloat(o.executed_funds ?? '0');
    if (execFunds > 0 && execVol > 0) {
      filledPrice = String(execFunds / execVol);
    } else if (o.trades && o.trades.length > 0) {
      let totalFunds = 0;
      let totalVolume = 0;
      for (const trade of o.trades) {
        totalFunds += parseFloat(trade.funds);
        totalVolume += parseFloat(trade.volume);
      }
      filledPrice = totalVolume > 0 ? String(totalFunds / totalVolume) : '0';
    }

    return {
      exchange: this.exchangeId,
      orderId: o.uuid,
      symbol: o.market,
      side: o.side === 'bid' ? 'buy' : 'sell',
      type: o.ord_type === 'limit' ? 'limit' : 'market',
      status,
      quantity: o.volume ?? o.executed_volume ?? '0',
      filledQuantity: o.executed_volume,
      price: o.price ?? '0',
      filledPrice,
      fee: o.paid_fee ?? '0',
      feeCurrency: 'KRW',
      timestamp: new Date(o.created_at).getTime(),
    };
  }

  private async request(
    credentials: ExchangeCredentials,
    method: string,
    path: string,
    queryString?: string,
    body?: Record<string, string>,
  ): Promise<Response> {
    const payload: Record<string, string> = {
      access_key: credentials.apiKey,
      nonce: uuidv4(),
    };

    // For POST with body, compute query_hash from body params as query string
    const hashSource = body ? new URLSearchParams(body).toString() : queryString;

    if (hashSource) {
      const hash = createHash('sha512').update(hashSource).digest('hex');
      payload.query_hash = hash;
      payload.query_hash_alg = 'SHA512';
    }

    const token = jwt.sign(payload, credentials.secretKey);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    const fetchOptions: RequestInit = { method, headers };

    if (body) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE_URL}${path}`, fetchOptions);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upbit API error ${res.status}: ${text}`);
    }

    return res;
  }
}
