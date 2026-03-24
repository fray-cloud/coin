import { createHmac } from 'crypto';
import { ExchangeCredentials, Balance, OrderResult } from '@coin/types';
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
    const data = (await res.json()) as {
      result: {
        list: Array<{
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
        }>;
      };
    };

    return (data.result?.list ?? []).map((o) => ({
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
    }));
  }

  private async signedRequest(
    credentials: ExchangeCredentials,
    method: string,
    path: string,
    params: Record<string, string> = {},
  ): Promise<Response> {
    const timestamp = String(Date.now());
    const queryString = new URLSearchParams(params).toString();

    const signPayload = `${timestamp}${credentials.apiKey}${RECV_WINDOW}${queryString}`;
    const signature = createHmac('sha256', credentials.secretKey).update(signPayload).digest('hex');

    const headers: Record<string, string> = {
      'X-BAPI-API-KEY': credentials.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': RECV_WINDOW,
    };

    const url = queryString ? `${BASE_URL}${path}?${queryString}` : `${BASE_URL}${path}`;

    const res = await fetch(url, { method, headers });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Bybit API error ${res.status}: ${body}`);
    }

    return res;
  }
}
