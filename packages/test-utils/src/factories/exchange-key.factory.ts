export interface MockExchangeKey {
  id: string;
  userId: string;
  exchange: string;
  apiKey: string;
  secretKey: string;
  createdAt: Date;
  updatedAt: Date;
}

let keyCounter = 0;

export function createMockExchangeKey(overrides: Partial<MockExchangeKey> = {}): MockExchangeKey {
  keyCounter++;
  return {
    id: `key-${keyCounter}`,
    userId: 'user-1',
    exchange: 'upbit',
    apiKey: 'encrypted-api-key',
    secretKey: 'encrypted-secret-key',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function resetExchangeKeyCounter() {
  keyCounter = 0;
}
