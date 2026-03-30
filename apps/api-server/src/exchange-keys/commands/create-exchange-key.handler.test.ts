import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CreateExchangeKeyCommand } from './create-exchange-key.command';

const mockGetBalances = vi.fn().mockResolvedValue([]);

// Mock exchange adapters with class constructors
vi.mock('@coin/exchange-adapters', () => {
  class MockAdapter {
    getBalances = mockGetBalances;
  }
  return {
    UpbitRest: MockAdapter,
    BinanceRest: MockAdapter,
    BybitRest: MockAdapter,
  };
});

// Import after mock
const { CreateExchangeKeyHandler } = await import('./create-exchange-key.handler');

const mockPrisma = {
  exchangeKey: { upsert: vi.fn() },
};
const mockConfig = {
  getOrThrow: vi.fn().mockReturnValue('a'.repeat(64)),
};

describe('CreateExchangeKeyHandler', () => {
  let handler: InstanceType<typeof CreateExchangeKeyHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.getOrThrow.mockReturnValue('a'.repeat(64));
    mockGetBalances.mockResolvedValue([]);
    handler = new CreateExchangeKeyHandler(mockPrisma as never, mockConfig as never);
  });

  it('should create/upsert an exchange key with encrypted credentials', async () => {
    mockPrisma.exchangeKey.upsert.mockResolvedValue({
      id: 'key-1',
      exchange: 'upbit',
      createdAt: new Date(),
    });

    const result = await handler.execute(
      new CreateExchangeKeyCommand('user-1', {
        exchange: 'upbit',
        apiKey: 'my-api-key',
        secretKey: 'my-secret',
      } as never),
    );

    expect(result).toHaveProperty('id', 'key-1');
    const upsertCall = mockPrisma.exchangeKey.upsert.mock.calls[0][0];
    expect(upsertCall.create.apiKey).not.toBe('my-api-key');
    expect(upsertCall.create.secretKey).not.toBe('my-secret');
  });

  it('should throw if ENCRYPTION_MASTER_KEY is not configured', async () => {
    mockConfig.getOrThrow.mockImplementation(() => {
      throw new Error('Missing ENCRYPTION_MASTER_KEY');
    });

    await expect(
      handler.execute(
        new CreateExchangeKeyCommand('user-1', {
          exchange: 'upbit',
          apiKey: 'key',
          secretKey: 'secret',
        } as never),
      ),
    ).rejects.toThrow();
  });

  it('should throw BadRequestException if API validation fails', async () => {
    mockGetBalances.mockRejectedValue(new Error('Invalid API key'));

    await expect(
      handler.execute(
        new CreateExchangeKeyCommand('user-1', {
          exchange: 'upbit',
          apiKey: 'bad-key',
          secretKey: 'bad-secret',
        } as never),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
