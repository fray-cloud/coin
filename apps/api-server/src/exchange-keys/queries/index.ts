import { GetExchangeKeysHandler } from './get-exchange-keys.handler';
import { GetBalancesHandler } from './get-balances.handler';
import { GetOpenOrdersHandler } from './get-open-orders.handler';
import { GetMarketsHandler } from './get-markets.handler';

export const ExchangeKeyQueryHandlers = [
  GetExchangeKeysHandler,
  GetBalancesHandler,
  GetOpenOrdersHandler,
  GetMarketsHandler,
];

export { GetExchangeKeysQuery } from './get-exchange-keys.query';
export { GetBalancesQuery } from './get-balances.query';
export { GetOpenOrdersQuery } from './get-open-orders.query';
export { GetMarketsQuery } from './get-markets.query';
