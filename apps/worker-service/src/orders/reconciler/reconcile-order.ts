import type Redis from 'ioredis';
import type { OrderResultEvent, NotificationEvent } from '@coin/kafka-contracts';
import type { IncomeRecord, Position, PositionSide } from '@coin/types';

export type CloseReason =
  | 'take_profit'
  | 'stop_loss'
  | 'liquidation'
  | 'manual'
  | 'manual_on_exchange'
  | 'reconciled_unknown';

export interface ReconcileOrderInput {
  id: string;
  userId: string;
  exchange: string;
  symbol: string;
  side: string;
  quantity: string;
  filledQuantity: string;
  entryPrice: string | null;
  tpOrderId: string | null;
  slOrderId: string | null;
  exchangeKeyId: string | null;
  createdAt: Date;
}

export interface ReconcileOrderDelegate {
  updateMany(args: {
    where: { id: string; closedAt: null };
    data: {
      status: string;
      closedAt: Date;
      realizedPnl: string | null;
      closeReason: string;
    };
  }): Promise<{ count: number }>;
}

export interface ReconcileDeps {
  prisma: { order: ReconcileOrderDelegate };
  redis: Pick<Redis, 'set' | 'del'>;
  getPosition(symbol: string): Promise<Position | null>;
  getIncome(opts: {
    symbol: string;
    startTime: number;
    endTime: number;
    limit?: number;
  }): Promise<IncomeRecord[]>;
  emit(events: { result?: OrderResultEvent; notification?: NotificationEvent }[]): Promise<void>;
}

export type ReconcileOutcome =
  | { action: 'skip'; reason: 'live_position' | 'lock_held' | 'race_lost' }
  | {
      action: 'closed';
      reason: CloseReason;
      realizedPnl: string | null;
    };

const REASON_LABEL: Record<CloseReason, string> = {
  take_profit: 'TP 익절',
  stop_loss: 'SL 손절',
  liquidation: '청산',
  manual: '수동 종료',
  manual_on_exchange: '거래소에서 직접 종료',
  reconciled_unknown: '동기화 (사유 미상)',
};

/**
 * Pure (modulo deps) reconcile of a single order. Idempotent via Redis lock.
 *
 * Flow:
 *   1. Acquire lock keyed by order id (NX). If held, skip.
 *   2. Query live position. If still open with non-zero qty → skip.
 *   3. Query income window since order createdAt; pick rows whose tradeId
 *      matches our recorded tpOrderId / slOrderId. Use those to derive
 *      reason. Otherwise classify by income types present.
 *   4. Sum REALIZED_PNL + COMMISSION + FUNDING_FEE for the symbol.
 *   5. Atomically mark order closed (only if not already closed) and emit
 *      result + notification events.
 */
export async function reconcileOrder(
  order: ReconcileOrderInput,
  deps: ReconcileDeps,
): Promise<ReconcileOutcome> {
  const lockKey = `reconcile:order:${order.id}`;
  const acquired = await deps.redis.set(lockKey, '1', 'EX', 60, 'NX');
  if (!acquired) return { action: 'skip', reason: 'lock_held' };

  try {
    const live = await deps.getPosition(order.symbol);
    if (live && Number(live.quantity) > 0) {
      return { action: 'skip', reason: 'live_position' };
    }

    // Lookback window: the entire life of the trade plus a small slack on
    // either side so we don't miss a fill that landed micro-seconds before
    // our createdAt timestamp.
    const startTime = order.createdAt.getTime() - 5_000;
    const endTime = Date.now();
    const incomes = await deps.getIncome({
      symbol: order.symbol,
      startTime,
      endTime,
      limit: 1000,
    });

    const { reason, realizedPnl } = classify(order, incomes);

    // Race-safe update — only flip if still open. Returns 0 rows if a
    // concurrent writer (manual close) already closed it.
    const updated = await deps.prisma.order.updateMany({
      where: { id: order.id, closedAt: null },
      data: {
        status: 'closed',
        closedAt: new Date(),
        realizedPnl,
        closeReason: reason,
      },
    });
    if (updated.count === 0) {
      return { action: 'skip', reason: 'race_lost' };
    }

    await deps.emit([
      {
        notification: {
          userId: order.userId,
          type: 'order_filled',
          title: `포지션 종료 | ${order.exchange.toUpperCase()} ${order.symbol}`,
          message: `${REASON_LABEL[reason]} — ${realizedPnl ? `PnL ${realizedPnl}` : '실현 손익 미정'}`,
        },
      },
    ]);

    return { action: 'closed', reason, realizedPnl };
  } finally {
    await deps.redis.del(lockKey).catch(() => undefined);
  }
}

interface Classified {
  reason: CloseReason;
  realizedPnl: string | null;
}

function classify(order: ReconcileOrderInput, incomes: IncomeRecord[]): Classified {
  const symbolIncomes = incomes.filter((i) => !i.symbol || i.symbol === order.symbol);

  const realized = symbolIncomes.filter((i) => i.incomeType === 'REALIZED_PNL');
  const commissions = symbolIncomes.filter((i) => i.incomeType === 'COMMISSION');
  const funding = symbolIncomes.filter((i) => i.incomeType === 'FUNDING_FEE');
  const insurance = symbolIncomes.filter((i) => i.incomeType === 'INSURANCE_CLEAR');

  // Liquidation: Binance writes INSURANCE_CLEAR rows on forced close.
  if (insurance.length > 0) {
    return {
      reason: 'liquidation',
      realizedPnl: sumPnl([...realized, ...commissions, ...funding, ...insurance]),
    };
  }

  // Match TP/SL by tradeId — Binance reports the trade that closed the
  // position; tradeId on REALIZED_PNL == the algoOrder's tradeId, but in
  // practice we store tpOrderId/slOrderId as algoIds, and those don't
  // appear directly. So we use a heuristic: positive PnL → TP, negative → SL,
  // ONLY when both tpOrderId and slOrderId were registered. Otherwise mark
  // as manual_on_exchange.
  if (realized.length > 0) {
    const total = sumPnl([...realized, ...commissions, ...funding]);
    const totalNum = Number(total);

    if (order.tpOrderId && order.slOrderId) {
      const reason: CloseReason = totalNum >= 0 ? 'take_profit' : 'stop_loss';
      return { reason, realizedPnl: total };
    }
    return { reason: 'manual_on_exchange', realizedPnl: total };
  }

  // Position closed but no income rows yet (Binance can lag a few seconds).
  // Estimate from entry vs… we don't have a fill price here, so leave null
  // and let the next tick refine when income lands.
  if (order.entryPrice) {
    const direction = (order.side as PositionSide) === 'long' ? 1 : -1;
    void direction;
  }
  return { reason: 'reconciled_unknown', realizedPnl: null };
}

function sumPnl(records: IncomeRecord[]): string {
  let total = 0;
  for (const r of records) {
    const v = Number(r.income);
    if (Number.isFinite(v)) total += v;
  }
  return total.toFixed(8);
}
