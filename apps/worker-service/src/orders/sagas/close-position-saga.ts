import { Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type {
  OrderCloseRequestedEvent,
  OrderResultEvent,
  NotificationEvent,
} from '@coin/kafka-contracts';
import type { ExchangeId, ExchangeCredentials, PositionSide } from '@coin/types';
import { BinanceRest, IExchangeRest } from '@coin/exchange-adapters';
import { decrypt } from '@coin/utils';
import { PrismaService } from '../../prisma/prisma.service';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  binance: () => new BinanceRest(),
};

// Binance error codes that mean "position no longer exists" — TP/SL already fired,
// liquidation, or another reduceOnly already drained it. In all of these cases the
// physical position is gone and the right action is to mark our order closed.
const POSITION_GONE_CODES = ['-2022', '-4046', '-2023', '-4045'];

function isPositionGoneError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return POSITION_GONE_CODES.some((c) => err.message.includes(c));
}

export async function executeClosePositionSaga(
  event: OrderCloseRequestedEvent,
  prisma: PrismaService,
  producer: Producer,
  redis: Redis,
): Promise<void> {
  const logger = new Logger('ClosePositionSaga');
  const lockKey = `saga:close-lock:${event.requestId}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 60, 'NX');
  if (!acquired) {
    logger.log(`Duplicate close request: ${event.requestId}`);
    return;
  }

  const order = await prisma.order.findFirst({
    where: { id: event.dbOrderId, userId: event.userId },
  });
  if (!order) {
    logger.warn(`Order not found for close: ${event.dbOrderId}`);
    return;
  }
  if (order.closedAt) {
    logger.warn(`Order already closed: ${event.dbOrderId}`);
    return;
  }
  if (!order.exchangeKeyId) {
    logger.error(`Order ${event.dbOrderId} has no exchangeKeyId; cannot close`);
    return;
  }

  const exchangeKey = await prisma.exchangeKey.findFirst({
    where: { id: order.exchangeKeyId, userId: event.userId },
  });
  if (!exchangeKey) {
    logger.error(`Exchange key not found for close: ${order.exchangeKeyId}`);
    return;
  }

  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) throw new Error('ENCRYPTION_MASTER_KEY not configured');

  const credentials: ExchangeCredentials = {
    apiKey: decrypt(exchangeKey.apiKey, masterKey),
    secretKey: decrypt(exchangeKey.secretKey, masterKey),
    network: (exchangeKey.network as 'mainnet' | 'testnet') ?? 'mainnet',
  };

  const adapter = REST_ADAPTERS[order.exchange as ExchangeId]();
  const side = order.side as PositionSide;
  const quantity = order.filledQuantity || order.quantity;

  // 1. If the position is already gone on Binance (TP/SL fired, liquidation,
  //    or a previous close request succeeded), just reconcile our DB and stop.
  const livePosBefore = await adapter.getPosition(credentials, order.symbol).catch((e) => {
    logger.warn(`getPosition pre-check failed: ${e}`);
    return null;
  });
  if (!livePosBefore) {
    logger.warn(`Position already gone on exchange — reconciling order ${order.id}`);
    await markOrderClosed(prisma, order.id, null, 'manual_on_exchange');
    await emitClosedEvents(
      producer,
      event,
      order,
      side,
      quantity,
      null,
      '포지션 종료 (이미 닫혀있던 포지션 동기화)',
    );
    return;
  }

  let closeResult: Awaited<ReturnType<typeof adapter.closePosition>> | null = null;
  try {
    closeResult = await adapter.closePosition(credentials, order.symbol, side, quantity);
    logger.log(
      `Close placed: ${order.id} → exchangeOrderId=${closeResult.orderId} status=${closeResult.status}`,
    );
  } catch (err) {
    if (isPositionGoneError(err)) {
      logger.warn(`Close request rejected (position gone): ${err}. Reconciling.`);
      await markOrderClosed(prisma, order.id, null, 'manual_on_exchange');
      await emitClosedEvents(
        producer,
        event,
        order,
        side,
        quantity,
        null,
        '포지션 종료 (거래소에 포지션 없음)',
      );
      return;
    }
    logger.error(`Close failed for ${order.id}: ${err}`);
    await producer.send({
      topic: KAFKA_TOPICS.NOTIFICATION_SEND,
      messages: [
        {
          key: event.userId,
          value: JSON.stringify({
            userId: event.userId,
            type: 'order_failed',
            title: `포지션 종료 실패 | ${order.exchange.toUpperCase()} ${order.symbol}`,
            message: String(err instanceof Error ? err.message : err),
          } satisfies NotificationEvent),
        },
      ],
    });
    throw err;
  }

  // 2. Estimate realizedPnl from entry vs close fill (Binance's MARKET reduceOnly
  //    fills near-instantly, but avgPrice may be 0 in the immediate response).
  let realizedPnl: string | null = null;
  const entry = Number(order.entryPrice ?? 0);
  const fill = Number(closeResult.filledPrice ?? 0);
  const qty = Number(quantity);
  if (entry && fill && qty) {
    const direction = side === 'long' ? 1 : -1;
    realizedPnl = String(((fill - entry) * qty * direction).toFixed(8));
  }

  await markOrderClosed(prisma, order.id, realizedPnl, 'manual');
  await emitClosedEvents(
    producer,
    event,
    order,
    side,
    quantity,
    closeResult,
    `${side.toUpperCase()} ${quantity} 수동 종료 완료`,
  );
}

async function markOrderClosed(
  prisma: PrismaService,
  orderId: string,
  realizedPnl: string | null,
  closeReason: 'manual' | 'manual_on_exchange' = 'manual',
) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'closed', closedAt: new Date(), realizedPnl, closeReason },
  });
}

async function emitClosedEvents(
  producer: Producer,
  event: OrderCloseRequestedEvent,
  order: { exchange: string; symbol: string },
  side: PositionSide,
  quantity: string,
  closeResult: Awaited<ReturnType<BinanceRest['closePosition']>> | null,
  message: string,
) {
  if (closeResult) {
    const resultEvent: OrderResultEvent = {
      requestId: event.requestId,
      userId: event.userId,
      dbOrderId: event.dbOrderId,
      result: { ...closeResult },
      mode: 'real',
    };
    await producer.send({
      topic: KAFKA_TOPICS.TRADING_ORDER_RESULT,
      messages: [{ key: event.userId, value: JSON.stringify(resultEvent) }],
    });
  }

  const notif: NotificationEvent = {
    userId: event.userId,
    type: 'order_filled',
    title: `포지션 종료 | ${order.exchange.toUpperCase()} ${order.symbol}`,
    message,
  };
  await producer.send({
    topic: KAFKA_TOPICS.NOTIFICATION_SEND,
    messages: [{ key: event.userId, value: JSON.stringify(notif) }],
  });
  void side; // referenced for type discipline; message already encodes it
  void quantity;
}
