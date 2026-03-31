import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DeleteExchangeKeyHandler } from './delete-exchange-key.handler';
import { DeleteExchangeKeyCommand } from './delete-exchange-key.command';

const mockPrisma = {
  exchangeKey: { findFirst: vi.fn(), delete: vi.fn() },
};

describe('DeleteExchangeKeyHandler', () => {
  let handler: DeleteExchangeKeyHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new DeleteExchangeKeyHandler(mockPrisma as never);
  });

  it('거래소 키를 삭제해야 한다', async () => {
    mockPrisma.exchangeKey.findFirst.mockResolvedValue({ id: 'key-1' });
    mockPrisma.exchangeKey.delete.mockResolvedValue({ id: 'key-1' });

    const result = await handler.execute(new DeleteExchangeKeyCommand('user-1', 'key-1'));
    expect(result).toEqual({ message: 'Deleted' });
  });

  it('키를 찾을 수 없으면 예외를 던져야 한다', async () => {
    mockPrisma.exchangeKey.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new DeleteExchangeKeyCommand('user-1', 'non-existent')),
    ).rejects.toThrow(NotFoundException);
  });
});
