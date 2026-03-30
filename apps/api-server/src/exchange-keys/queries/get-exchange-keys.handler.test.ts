import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetExchangeKeysHandler } from './get-exchange-keys.handler';
import { GetExchangeKeysQuery } from './get-exchange-keys.query';

const mockPrisma = { exchangeKey: { findMany: vi.fn() } };

describe('GetExchangeKeysHandler', () => {
  let handler: GetExchangeKeysHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetExchangeKeysHandler(mockPrisma as never);
  });

  it('should return exchange keys without sensitive data', async () => {
    const keys = [{ id: 'key-1', exchange: 'upbit', createdAt: new Date() }];
    mockPrisma.exchangeKey.findMany.mockResolvedValue(keys);

    const result = await handler.execute(new GetExchangeKeysQuery('user-1'));
    expect(result).toEqual(keys);
    // Should select specific fields (no apiKey/secretKey)
    const selectArg = mockPrisma.exchangeKey.findMany.mock.calls[0][0].select;
    if (selectArg) {
      expect(selectArg.apiKey).toBeUndefined();
      expect(selectArg.secretKey).toBeUndefined();
    }
  });
});
