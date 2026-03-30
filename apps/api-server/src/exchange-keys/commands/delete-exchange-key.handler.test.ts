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

  it('should delete an exchange key', async () => {
    mockPrisma.exchangeKey.findFirst.mockResolvedValue({ id: 'key-1' });
    mockPrisma.exchangeKey.delete.mockResolvedValue({ id: 'key-1' });

    const result = await handler.execute(new DeleteExchangeKeyCommand('user-1', 'key-1'));
    expect(result).toEqual({ message: 'Deleted' });
  });

  it('should throw if key not found', async () => {
    mockPrisma.exchangeKey.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new DeleteExchangeKeyCommand('user-1', 'non-existent')),
    ).rejects.toThrow(NotFoundException);
  });
});
