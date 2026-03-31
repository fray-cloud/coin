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

  it('암호화된 자격증명으로 거래소 키를 생성/upsert해야 한다', async () => {
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

  it('ENCRYPTION_MASTER_KEY가 설정되지 않으면 예외를 던져야 한다', async () => {
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

  it('API 검증에 실패하면 BadRequestException을 던져야 한다', async () => {
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
