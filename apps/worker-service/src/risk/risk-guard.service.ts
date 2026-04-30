import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { OrderRequest } from '@coin/types';
import { PrismaService } from '../prisma/prisma.service';

export interface GuardCheck {
  ok: boolean;
  reason?: string;
}

export interface GuardContext {
  userId: string;
  network: 'mainnet' | 'testnet';
  order: OrderRequest;
  /** Available margin balance in USDT (mainnet only). undefined to skip MAX_BET_PCT. */
  availableUsdt?: number;
}

/**
 * Seven safety guards run before any real-mode order placement. Each returns
 * `{ ok: false, reason }` to short-circuit the saga with a user-facing
 * message. Mainnet-only guards are no-ops on testnet (where the trader can
 * use fake USDT freely).
 *
 * Tunables come from env so ops can dial them without redeploy:
 *   KILL_SWITCH_REAL_TRADING   ('true' to disable mainnet entirely)
 *   DAILY_LOSS_LIMIT_USDT      (default 50)
 *   MAX_LEVERAGE               (default 20)
 *   MAX_BET_PCT                (default 10)  // % of availableUsdt
 *   LLM_COOLDOWN_SECONDS       (default 30)
 *   MAX_OPEN_POSITIONS_PER_USER (default 1)
 */
@Injectable()
export class RiskGuardService {
  private readonly logger = new Logger(RiskGuardService.name);
  private redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async checkAll(ctx: GuardContext): Promise<GuardCheck> {
    const checks: Array<() => Promise<GuardCheck>> = [
      () => this.killSwitch(ctx),
      () => this.maxLeverage(ctx),
      () => this.cooldown(ctx),
      () => this.maxOpenPositions(ctx),
      () => this.dailyLossLimit(ctx),
      () => this.maxBetPct(ctx),
    ];
    for (const check of checks) {
      const r = await check();
      if (!r.ok) {
        this.logger.warn(`Guard blocked trade: ${r.reason}`);
        return r;
      }
    }
    return { ok: true };
  }

  /** 1. Global kill switch for mainnet real trading. */
  private async killSwitch(ctx: GuardContext): Promise<GuardCheck> {
    if (ctx.network === 'testnet') return { ok: true };
    if (process.env.KILL_SWITCH_REAL_TRADING === 'true') {
      return { ok: false, reason: 'Real mainnet trading is disabled (KILL_SWITCH_REAL_TRADING)' };
    }
    if (process.env.ENABLE_REAL_MAINNET !== 'true') {
      return { ok: false, reason: 'Mainnet trading not enabled (ENABLE_REAL_MAINNET=false)' };
    }
    return { ok: true };
  }

  /** 2. Hard leverage cap regardless of user input. */
  private async maxLeverage(ctx: GuardContext): Promise<GuardCheck> {
    const max = Number(process.env.MAX_LEVERAGE ?? 20);
    if (ctx.order.leverage > max) {
      return { ok: false, reason: `Leverage ${ctx.order.leverage}x exceeds cap of ${max}x` };
    }
    return { ok: true };
  }

  /** 3. Per-user cooldown between LLM-driven trades to avoid Pro/Max rate limits. */
  private async cooldown(ctx: GuardContext): Promise<GuardCheck> {
    const seconds = Number(process.env.LLM_COOLDOWN_SECONDS ?? 30);
    if (seconds <= 0) return { ok: true };
    const key = `llm:cooldown:${ctx.userId}`;
    const acquired = await this.redis.set(key, '1', 'EX', seconds, 'NX');
    if (!acquired) {
      const ttl = await this.redis.ttl(key);
      return { ok: false, reason: `Cooldown active — wait ${ttl}s` };
    }
    return { ok: true };
  }

  /** 4. Cap concurrent open positions per user. */
  private async maxOpenPositions(ctx: GuardContext): Promise<GuardCheck> {
    const max = Number(process.env.MAX_OPEN_POSITIONS_PER_USER ?? 1);
    const open = await this.prisma.order.count({
      where: {
        userId: ctx.userId,
        status: { in: ['placed', 'partial', 'filled'] },
        closedAt: null,
      },
    });
    if (open >= max) {
      return { ok: false, reason: `${open} open position(s) — cap is ${max}` };
    }
    return { ok: true };
  }

  /** 5. Daily realized loss ceiling (mainnet only). */
  private async dailyLossLimit(ctx: GuardContext): Promise<GuardCheck> {
    if (ctx.network === 'testnet') return { ok: true };
    const limit = Number(process.env.DAILY_LOSS_LIMIT_USDT ?? 50);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const todayClosed = await this.prisma.order.findMany({
      where: {
        userId: ctx.userId,
        closedAt: { gte: since },
        realizedPnl: { not: null },
      },
      select: { realizedPnl: true },
    });
    const realized = todayClosed.reduce((sum, o) => sum + Number(o.realizedPnl ?? 0), 0);
    if (realized <= -limit) {
      return { ok: false, reason: `Daily loss limit hit: ${realized.toFixed(2)} ≤ -${limit} USDT` };
    }
    return { ok: true };
  }

  /** 6. Bet must not exceed configured % of available margin (mainnet only). */
  private async maxBetPct(ctx: GuardContext): Promise<GuardCheck> {
    if (ctx.network === 'testnet') return { ok: true };
    if (ctx.availableUsdt === undefined) return { ok: true };
    const pct = Number(process.env.MAX_BET_PCT ?? 10) / 100;
    const notional = Number(ctx.order.quantity) * Number(ctx.order.price ?? 0);
    const margin = notional / Math.max(ctx.order.leverage, 1);
    if (margin > ctx.availableUsdt * pct) {
      return {
        ok: false,
        reason: `Required margin ${margin.toFixed(2)} USDT exceeds ${(pct * 100).toFixed(0)}% of available ${ctx.availableUsdt.toFixed(2)}`,
      };
    }
    return { ok: true };
  }
}
