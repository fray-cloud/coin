import { createHmac } from 'crypto';
import { ExchangeCredentials, Balance, OrderResult } from '@coin/types';
import { IExchangeRest } from '../interfaces/exchange-rest';

const BASE_URL = 'https://api.binance.com';

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
    const data = (await res.json()) as Array<{
      orderId: number;
      symbol: string;
      side: string;
      type: string;
      status: string;
      origQty: string;
      executedQty: string;
      price: string;
      time: number;
    }>;

    return data.map((o) => ({
      exchange: this.exchangeId,
      orderId: String(o.orderId),
      symbol: o.symbol,
      side: o.side.toLowerCase() as 'buy' | 'sell',
      type: o.type === 'LIMIT' ? ('limit' as const) : ('market' as const),
      status: 'placed' as const,
      quantity: o.origQty,
      filledQuantity: o.executedQty,
      price: o.price,
      filledPrice: '0',
      fee: '0',
      feeCurrency: '',
      timestamp: o.time,
    }));
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

    const url = `${BASE_URL}${path}?${params.toString()}`;
    const res = await fetch(url, {
      method,
      headers: { 'X-MBX-APIKEY': credentials.apiKey },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Binance API error ${res.status}: ${body}`);
    }

    return res;
  }
}
