import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateOrderHandler } from './create-order.handler';
import { CreateOrderCommand } from './create-order.command';

const mockPrisma = { exchangeKey: { findFirst: vi.fn() } };
const mockOrchestrator = { startSaga: vi.fn() };

describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new CreateOrderHandler(mockPrisma as never, mockOrchestrator as never);
  });

  it('should create a paper market order', async () => {
    mockOrchestrator.startSaga.mockResolvedValue({ id: 'order-1', status: 'pending' });

    const result = await handler.execute(
      new CreateOrderCommand('user-1', {
        exchange: 'upbit',
        symbol: 'KRW-BTC',
        side: 'buy',
        type: 'market',
        mode: 'paper',
        quantity: '0.001',
      } as never),
    );

    expect(mockOrchestrator.startSaga).toHaveBeenCalled();
    expect(result).toEqual({ id: 'order-1', status: 'pending' });
  });

  it('should require exchangeKeyId for real mode', async () => {
    await expect(
      handler.execute(
        new CreateOrderCommand('user-1', {
          exchange: 'upbit',
          symbol: 'KRW-BTC',
          side: 'buy',
          type: 'market',
          mode: 'real',
          quantity: '0.001',
        } as never),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should validate exchange key exists for real mode', async () => {
    mockPrisma.exchangeKey.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(
        new CreateOrderCommand('user-1', {
          exchange: 'upbit',
          symbol: 'KRW-BTC',
          side: 'buy',
          type: 'market',
          mode: 'real',
          quantity: '0.001',
          exchangeKeyId: 'key-1',
        } as never),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should require price for limit orders', async () => {
    await expect(
      handler.execute(
        new CreateOrderCommand('user-1', {
          exchange: 'upbit',
          symbol: 'KRW-BTC',
          side: 'buy',
          type: 'limit',
          mode: 'paper',
          quantity: '0.001',
        } as never),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should strip commas from quantity', async () => {
    mockOrchestrator.startSaga.mockResolvedValue({ id: 'order-1' });

    await handler.execute(
      new CreateOrderCommand('user-1', {
        exchange: 'upbit',
        symbol: 'KRW-BTC',
        side: 'buy',
        type: 'market',
        mode: 'paper',
        quantity: '1,000.5',
      } as never),
    );

    const callArgs = mockOrchestrator.startSaga.mock.calls[0];
    expect(callArgs[1].quantity).toBe('1000.5');
  });
});
