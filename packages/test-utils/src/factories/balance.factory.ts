import type { Balance, ExchangeId } from '@coin/types';

export function createMockBalance(overrides: Partial<Balance> = {}): Balance {
  return {
    exchange: 'binance' as ExchangeId,
    currency: 'USDT',
    free: '1000',
    locked: '0',
    ...overrides,
  };
}

export function createMockBalances(
  currencies: string[] = ['USDT', 'BTC', 'ETH'],
  exchange: ExchangeId = 'binance',
): Balance[] {
  return currencies.map((currency) => createMockBalance({ exchange, currency }));
}
