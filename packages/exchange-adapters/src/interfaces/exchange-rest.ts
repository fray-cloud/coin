import { ExchangeId, ExchangeCredentials, Balance, OrderResult } from '@coin/types';

export interface IExchangeRest {
  readonly exchangeId: ExchangeId;
  getBalances(credentials: ExchangeCredentials): Promise<Balance[]>;
  getOpenOrders(credentials: ExchangeCredentials, symbol?: string): Promise<OrderResult[]>;
}
