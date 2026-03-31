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

  it('페이퍼 시장가 주문을 생성해야 한다', async () => {
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

  it('실거래 모드에서는 exchangeKeyId가 필요하다', async () => {
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

  it('실거래 모드에서 거래소 키가 존재하는지 검증해야 한다', async () => {
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

  it('지정가 주문에는 가격이 필요하다', async () => {
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

  it('수량에서 쉼표를 제거해야 한다', async () => {
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
