import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn().mockResolvedValue(undefined) }));

vi.mock('kafkajs', () => {
  class FakeKafka {
    producer() {
      return {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        send: mockSend,
      };
    }
  }
  return { Kafka: FakeKafka };
});

import { CloseOrderHandler } from './close-order.handler';
import { CloseOrderCommand } from './close-order.command';

const mockPrisma = { order: { findFirst: vi.fn() } };

describe('CloseOrderHandler', () => {
  let handler: CloseOrderHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new CloseOrderHandler(mockPrisma as never);
  });

  it('찾을 수 없으면 NotFoundException', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    await expect(handler.execute(new CloseOrderCommand('u', 'x'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('이미 닫힌 주문은 거부', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'o',
      mode: 'real',
      status: 'filled',
      closedAt: new Date(),
      exchangeKeyId: 'k',
    });
    await expect(handler.execute(new CloseOrderCommand('u', 'o'))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('체결 안된 주문은 거부', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'o',
      mode: 'real',
      status: 'pending',
      closedAt: null,
      exchangeKeyId: 'k',
    });
    await expect(handler.execute(new CloseOrderCommand('u', 'o'))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('체결된 실거래 포지션은 Kafka 이벤트를 발행한다', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'o',
      mode: 'real',
      status: 'filled',
      closedAt: null,
      exchangeKeyId: 'k',
    });

    const result = await handler.execute(new CloseOrderCommand('u', 'o'));
    expect(result).toEqual({ id: 'o', status: 'pending' });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.topic).toBe('trading.order.close-requested');
    const payload = JSON.parse(call.messages[0].value);
    expect(payload.userId).toBe('u');
    expect(payload.dbOrderId).toBe('o');
    expect(payload.requestId).toBeTruthy();
  });
});
