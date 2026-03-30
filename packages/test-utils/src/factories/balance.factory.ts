import type { Balance, ExchangeId } from '@coin/types';

export function createMockBalance(overrides: Partial<Balance> = {}): Balance {
  return {
    exchange: 'upbit' as ExchangeId,
    currency: 'KRW',
    free: '1000000',
    locked: '0',
    ...overrides,
  };
}

export function createMockBalances(
  currencies: string[] = ['KRW', 'BTC', 'ETH'],
  exchange: ExchangeId = 'upbit',
): Balance[] {
  return currencies.map((currency) => createMockBalance({ exchange, currency }));
}
