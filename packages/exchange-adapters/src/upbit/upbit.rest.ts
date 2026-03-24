import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { ExchangeCredentials, Balance, OrderResult } from '@coin/types';
import { IExchangeRest } from '../interfaces/exchange-rest';

const BASE_URL = 'https://api.upbit.com';

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
    const data = (await res.json()) as Array<{
      uuid: string;
      side: string;
      ord_type: string;
      price: string | null;
      state: string;
      market: string;
      volume: string;
      remaining_volume: string;
      executed_volume: string;
      trades_count: number;
      created_at: string;
    }>;

    return data.map((o) => ({
      exchange: this.exchangeId,
      orderId: o.uuid,
      symbol: o.market,
      side: o.side === 'bid' ? ('buy' as const) : ('sell' as const),
      type: o.ord_type === 'limit' ? ('limit' as const) : ('market' as const),
      status: 'placed' as const,
      quantity: o.volume,
      filledQuantity: o.executed_volume,
      price: o.price ?? '0',
      filledPrice: '0',
      fee: '0',
      feeCurrency: 'KRW',
      timestamp: new Date(o.created_at).getTime(),
    }));
  }

  private async request(
    credentials: ExchangeCredentials,
    method: string,
    path: string,
    queryString?: string,
  ): Promise<Response> {
    const payload: Record<string, string> = {
      access_key: credentials.apiKey,
      nonce: uuidv4(),
    };

    if (queryString) {
      const hash = createHash('sha512').update(queryString).digest('hex');
      payload.query_hash = hash;
      payload.query_hash_alg = 'SHA512';
    }

    const token = jwt.sign(payload, credentials.secretKey);

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Upbit API error ${res.status}: ${body}`);
    }

    return res;
  }
}
