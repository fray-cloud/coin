import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RiskConfig {
  // ── Existing ────────────────────────────────────────────────────────────────
  stopLossPercent?: number;
  dailyMaxLossUsd?: number;
  maxPositionSize?: string;

  // ── VaR / CVaR (historical simulation) ──────────────────────────────────────
  /** Confidence level for VaR/CVaR, e.g. 0.95. Defaults to 0.95. */
  varConfidenceLevel?: number;
  /** Block trade if historical VaR (as % of order value) exceeds this. */
  varLimitPercent?: number;
  /** Block trade if historical CVaR (as % of order value) exceeds this. */
  cvarLimitPercent?: number;
  /** Days of order history to build the P&L distribution. Defaults to 30. */
  varLookbackDays?: number;

  // ── Volatility-adjusted position sizing (ATR-based) ─────────────────────────
  /** Current ATR value supplied by the strategy evaluator. */
  atrValue?: number;
  /** Baseline (normal) ATR used for proportional sizing. */
  atrBaselineValue?: number;
  /** Enable ATR-based quantity scaling. */
  volatilityAdjustedSizing?: boolean;

  // ── Dynamic drawdown limits ──────────────────────────────────────────────────
  /** Pause trading if cumulative drawdown from peak exceeds this % value. */
  maxDrawdownPercent?: number;
  /** Lookback window for peak P&L calculation. Defaults to 30 days. */
  drawdownLookbackDays?: number;

  // ── Kelly Criterion approximation ───────────────────────────────────────────
  /** Fractional Kelly multiplier, 0–1 (e.g. 0.5 = half-Kelly). Defaults to 0.5. */
  kellyMultiplier?: number;
  /** Days of closed trades to estimate win-rate. Defaults to 30. */
  kellyLookbackDays?: number;
  /** Hard upper cap on Kelly-computed position size. */
  kellyMaxPositionSize?: string;

  // ── Tail risk monitoring ─────────────────────────────────────────────────────
  /** Confidence level for tail-risk (extreme VaR), e.g. 0.99. */
  tailRiskConfidenceLevel?: number;
  /** Block trade if tail-risk (as % of order value) exceeds this. */
  tailRiskLimitPercent?: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  /** Quantity adjusted for volatility or Kelly sizing (use this for the order). */
  adjustedQuantity?: string;
  /** Live risk metrics for monitoring / alerting. */
  metrics?: {
    varPercent?: number;
    cvarPercent?: number;
    currentDrawdownPercent?: number;
    kellyFraction?: number;
    tailRiskPercent?: number;
  };
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkRisk(
    userId: string,
    exchange: string,
    symbol: string,
    signal: 'buy' | 'sell',
    quantity: string,
    currentPrice: number,
    riskConfig: RiskConfig,
  ): Promise<RiskCheckResult> {
    const metrics: RiskCheckResult['metrics'] = {};
    let adjustedQuantity = quantity;

    // 1. Stop-loss check
    if (riskConfig.stopLossPercent && signal === 'buy') {
      const result = await this.checkStopLoss(
        userId,
        exchange,
        symbol,
        currentPrice,
        riskConfig.stopLossPercent,
      );
      if (!result.allowed) return result;
    }

    // 2. Daily max loss check
    if (riskConfig.dailyMaxLossUsd) {
      const result = await this.checkDailyMaxLoss(userId, riskConfig.dailyMaxLossUsd);
      if (!result.allowed) return result;
    }

    // 3. Max position size check
    if (riskConfig.maxPositionSize && signal === 'buy') {
      const result = await this.checkMaxPositionSize(
        userId,
        exchange,
        symbol,
        quantity,
        riskConfig.maxPositionSize,
      );
      if (!result.allowed) return result;
    }

    // 4. Dynamic drawdown limit
    if (riskConfig.maxDrawdownPercent) {
      const result = await this.checkDrawdownLimit(
        userId,
        riskConfig.maxDrawdownPercent,
        riskConfig.drawdownLookbackDays ?? 30,
      );
      metrics.currentDrawdownPercent = result.drawdownPercent;
      if (!result.allowed) {
        return { allowed: false, reason: result.reason, metrics };
      }
    }

    // 5. VaR / CVaR checks
    if (riskConfig.varLimitPercent || riskConfig.cvarLimitPercent) {
      const orderValue = currentPrice * parseFloat(quantity);
      const result = await this.checkVarAndCVar(
        userId,
        orderValue,
        riskConfig.varConfidenceLevel ?? 0.95,
        riskConfig.varLookbackDays ?? 30,
        riskConfig.varLimitPercent,
        riskConfig.cvarLimitPercent,
      );
      metrics.varPercent = result.varPercent;
      metrics.cvarPercent = result.cvarPercent;
      if (!result.allowed) {
        return { allowed: false, reason: result.reason, metrics };
      }
    }

    // 6. Tail risk check
    if (riskConfig.tailRiskLimitPercent) {
      const orderValue = currentPrice * parseFloat(quantity);
      const result = await this.checkVarAndCVar(
        userId,
        orderValue,
        riskConfig.tailRiskConfidenceLevel ?? 0.99,
        riskConfig.varLookbackDays ?? 30,
        riskConfig.tailRiskLimitPercent,
        undefined,
      );
      metrics.tailRiskPercent = result.varPercent;
      if (!result.allowed) {
        return {
          allowed: false,
          reason: result.reason?.replace('VaR', 'Tail risk'),
          metrics,
        };
      }
    }

    // 7. Volatility-adjusted position sizing (ATR)
    if (
      riskConfig.volatilityAdjustedSizing &&
      riskConfig.atrValue &&
      riskConfig.atrBaselineValue &&
      riskConfig.atrBaselineValue > 0 &&
      signal === 'buy'
    ) {
      adjustedQuantity = this.applyAtrSizing(
        adjustedQuantity,
        riskConfig.atrValue,
        riskConfig.atrBaselineValue,
      );
    }

    // 8. Kelly Criterion sizing
    if (riskConfig.kellyMultiplier !== undefined || riskConfig.kellyLookbackDays !== undefined) {
      const result = await this.applyKellySizing(
        userId,
        exchange,
        symbol,
        adjustedQuantity,
        currentPrice,
        riskConfig.kellyMultiplier ?? 0.5,
        riskConfig.kellyLookbackDays ?? 30,
        riskConfig.kellyMaxPositionSize,
      );
      metrics.kellyFraction = result.kellyFraction;
      adjustedQuantity = result.quantity;
    }

    const hasAdjustment = adjustedQuantity !== quantity;
    return {
      allowed: true,
      adjustedQuantity: hasAdjustment ? adjustedQuantity : undefined,
      metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
    };
  }

  /**
   * Returns a Pearson correlation matrix of daily P&L across (exchange, symbol) pairs.
   * Useful for portfolio-level diversification analysis.
   */
  async getCorrelationMatrix(
    userId: string,
    symbols: { exchange: string; symbol: string }[],
    lookbackDays = 30,
  ): Promise<Record<string, Record<string, number>>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);

    const seriesMap: Record<string, Map<string, number>> = {};

    for (const { exchange, symbol } of symbols) {
      const key = `${exchange}:${symbol}`;
      const dailyPnl = await this.getDailyPnlSeries(userId, exchange, symbol, cutoff);
      seriesMap[key] = dailyPnl;
    }

    const keys = Object.keys(seriesMap);
    const result: Record<string, Record<string, number>> = {};

    for (const keyA of keys) {
      result[keyA] = {};
      for (const keyB of keys) {
        if (keyA === keyB) {
          result[keyA][keyB] = 1;
        } else {
          result[keyA][keyB] = this.pearsonCorrelation(seriesMap[keyA], seriesMap[keyB]);
        }
      }
    }

    return result;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async checkStopLoss(
    userId: string,
    exchange: string,
    symbol: string,
    currentPrice: number,
    stopLossPercent: number,
  ): Promise<RiskCheckResult> {
    const lastBuy = await this.prisma.order.findFirst({
      where: {
        userId,
        exchange,
        symbol,
        side: 'buy',
        status: 'filled',
        filledPrice: { not: '0' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastBuy) return { allowed: true };

    const buyPrice = parseFloat(lastBuy.filledPrice);
    if (buyPrice === 0) return { allowed: true };

    const lossPercent = ((buyPrice - currentPrice) / buyPrice) * 100;
    if (lossPercent >= stopLossPercent) {
      return {
        allowed: false,
        reason: `Stop-loss triggered: loss ${lossPercent.toFixed(2)}% >= limit ${stopLossPercent}%`,
      };
    }

    return { allowed: true };
  }

  private async checkDailyMaxLoss(
    userId: string,
    dailyMaxLossUsd: number,
  ): Promise<RiskCheckResult> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = await this.prisma.order.findMany({
      where: {
        userId,
        status: 'filled',
        createdAt: { gte: todayStart },
      },
    });

    let dailyPnl = 0;
    for (const order of todayOrders) {
      const filled = parseFloat(order.filledPrice) * parseFloat(order.filledQuantity);
      const fee = parseFloat(order.fee);
      if (order.side === 'sell') {
        dailyPnl += filled - fee;
      } else {
        dailyPnl -= filled + fee;
      }
    }

    if (dailyPnl < 0 && Math.abs(dailyPnl) >= dailyMaxLossUsd) {
      return {
        allowed: false,
        reason: `Daily loss limit reached: $${Math.abs(dailyPnl).toFixed(2)} >= $${dailyMaxLossUsd}`,
      };
    }

    return { allowed: true };
  }

  private async checkMaxPositionSize(
    userId: string,
    exchange: string,
    symbol: string,
    newQuantity: string,
    maxPositionSize: string,
  ): Promise<RiskCheckResult> {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        exchange,
        symbol,
        status: 'filled',
      },
    });

    let netPosition = 0;
    for (const order of orders) {
      const qty = parseFloat(order.filledQuantity);
      if (order.side === 'buy') {
        netPosition += qty;
      } else {
        netPosition -= qty;
      }
    }

    const maxSize = parseFloat(maxPositionSize);
    const newTotal = netPosition + parseFloat(newQuantity);

    if (newTotal > maxSize) {
      return {
        allowed: false,
        reason: `Position size limit: ${newTotal.toFixed(6)} > max ${maxSize}`,
      };
    }

    return { allowed: true };
  }

  private async checkDrawdownLimit(
    userId: string,
    maxDrawdownPercent: number,
    lookbackDays: number,
  ): Promise<{ allowed: boolean; reason?: string; drawdownPercent: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);

    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: 'filled',
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build cumulative P&L series
    let runningPnl = 0;
    let peakPnl = 0;

    for (const order of orders) {
      const filled = parseFloat(order.filledPrice) * parseFloat(order.filledQuantity);
      const fee = parseFloat(order.fee);
      if (order.side === 'sell') {
        runningPnl += filled - fee;
      } else {
        runningPnl -= filled + fee;
      }
      if (runningPnl > peakPnl) {
        peakPnl = runningPnl;
      }
    }

    // Only meaningful when we have a positive peak to drawdown from
    if (peakPnl <= 0) {
      return { allowed: true, drawdownPercent: 0 };
    }

    const drawdownPercent = ((peakPnl - runningPnl) / peakPnl) * 100;

    if (drawdownPercent >= maxDrawdownPercent) {
      return {
        allowed: false,
        reason: `Drawdown limit: ${drawdownPercent.toFixed(2)}% >= max ${maxDrawdownPercent}%`,
        drawdownPercent,
      };
    }

    return { allowed: true, drawdownPercent };
  }

  private async checkVarAndCVar(
    userId: string,
    orderValue: number,
    confidenceLevel: number,
    lookbackDays: number,
    varLimitPercent?: number,
    cvarLimitPercent?: number,
  ): Promise<{ allowed: boolean; reason?: string; varPercent: number; cvarPercent: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);

    const dailyPnlMap = await this.getDailyPnlSeries(userId, undefined, undefined, cutoff);
    const dailyPnls = Array.from(dailyPnlMap.values());

    const { var: varAbs, cvar: cvarAbs } = this.computeVarAndCVar(dailyPnls, confidenceLevel);

    const varPercent = orderValue > 0 ? (varAbs / orderValue) * 100 : 0;
    const cvarPercent = orderValue > 0 ? (cvarAbs / orderValue) * 100 : 0;

    if (varLimitPercent && varPercent > varLimitPercent) {
      return {
        allowed: false,
        reason: `VaR limit: ${varPercent.toFixed(2)}% > max ${varLimitPercent}% (confidence ${(confidenceLevel * 100).toFixed(0)}%)`,
        varPercent,
        cvarPercent,
      };
    }

    if (cvarLimitPercent && cvarPercent > cvarLimitPercent) {
      return {
        allowed: false,
        reason: `CVaR limit: ${cvarPercent.toFixed(2)}% > max ${cvarLimitPercent}%`,
        varPercent,
        cvarPercent,
      };
    }

    return { allowed: true, varPercent, cvarPercent };
  }

  private applyAtrSizing(quantity: string, atrValue: number, atrBaselineValue: number): string {
    const qty = parseFloat(quantity);
    // Scale down proportionally when ATR exceeds baseline; never scale up
    const scaleFactor = Math.min(1, atrBaselineValue / atrValue);
    const adjusted = qty * scaleFactor;
    // Keep 6 decimal places (crypto precision)
    return adjusted.toFixed(6);
  }

  private async applyKellySizing(
    userId: string,
    exchange: string,
    symbol: string,
    quantity: string,
    currentPrice: number,
    multiplier: number,
    lookbackDays: number,
    maxPositionSize?: string,
  ): Promise<{ quantity: string; kellyFraction: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);

    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        exchange,
        symbol,
        status: 'filled',
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'asc' },
    });

    const { winRate, avgWin, avgLoss } = this.computeWinRateStats(orders);

    // Not enough data — use original quantity
    if (winRate === 0 || avgLoss === 0) {
      return { quantity, kellyFraction: multiplier };
    }

    // f* = W/L - (1-W) / (W/L)  where W = win rate, W/L = avg win / avg loss ratio
    const winLossRatio = avgWin / avgLoss;
    const fullKelly = winRate - (1 - winRate) / winLossRatio;

    // Clamp Kelly to [0, 1]
    const kellyFraction = Math.max(0, Math.min(1, fullKelly * multiplier));

    if (kellyFraction === 0) {
      this.logger.warn(`Kelly fraction is 0 — no trade recommended for ${exchange}:${symbol}`);
      return { quantity: '0', kellyFraction: 0 };
    }

    // Kelly fraction represents fraction of capital; translate to quantity adjustment
    // We treat it as a scaling factor relative to base quantity
    const originalQty = parseFloat(quantity);
    let adjustedQty = originalQty * kellyFraction;

    if (maxPositionSize) {
      adjustedQty = Math.min(adjustedQty, parseFloat(maxPositionSize));
    }

    return {
      quantity: adjustedQty.toFixed(6),
      kellyFraction,
    };
  }

  // ── Statistical helpers ──────────────────────────────────────────────────────

  private computeVarAndCVar(
    dailyPnls: number[],
    confidenceLevel: number,
  ): { var: number; cvar: number } {
    if (dailyPnls.length < 2) return { var: 0, cvar: 0 };

    const sorted = [...dailyPnls].sort((a, b) => a - b);
    // Index of the worst-loss observation at the given confidence level (0-based).
    // Using Math.round to avoid floating-point imprecision (e.g. (1-0.95)*20 ≈ 1.00...009).
    const cutoffIndex = Math.max(0, Math.round((1 - confidenceLevel) * sorted.length) - 1);

    // VaR: the loss at the cutoff percentile (positive = loss)
    const varValue = -sorted[cutoffIndex];

    // CVaR: average of losses at or beyond VaR
    const tailLosses = sorted.slice(0, cutoffIndex + 1).map((v) => -v);
    const cvarValue =
      tailLosses.length > 0 ? tailLosses.reduce((a, b) => a + b, 0) / tailLosses.length : varValue;

    return { var: Math.max(0, varValue), cvar: Math.max(0, cvarValue) };
  }

  private computeWinRateStats(
    orders: { side: string; filledPrice: string; filledQuantity: string; fee: string }[],
  ): { winRate: number; avgWin: number; avgLoss: number } {
    // Pair buys with sells chronologically (FIFO)
    const buys = orders.filter((o) => o.side === 'buy');
    const sells = orders.filter((o) => o.side === 'sell');

    const tradeResults: number[] = [];
    const buyQueue = [...buys];

    for (const sell of sells) {
      const buy = buyQueue.shift();
      if (!buy) break;

      const buyValue =
        parseFloat(buy.filledPrice) * parseFloat(buy.filledQuantity) + parseFloat(buy.fee);
      const sellValue =
        parseFloat(sell.filledPrice) * parseFloat(sell.filledQuantity) - parseFloat(sell.fee);

      tradeResults.push(sellValue - buyValue);
    }

    if (tradeResults.length === 0) {
      return { winRate: 0, avgWin: 0, avgLoss: 0 };
    }

    const wins = tradeResults.filter((r) => r > 0);
    const losses = tradeResults.filter((r) => r <= 0);

    const winRate = wins.length / tradeResults.length;
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss =
      losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;

    return { winRate, avgWin, avgLoss };
  }

  private async getDailyPnlSeries(
    userId: string,
    exchange: string | undefined,
    symbol: string | undefined,
    cutoff: Date,
  ): Promise<Map<string, number>> {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        ...(exchange ? { exchange } : {}),
        ...(symbol ? { symbol } : {}),
        status: 'filled',
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyPnl = new Map<string, number>();

    for (const order of orders) {
      const day = order.createdAt.toISOString().slice(0, 10);
      const filled = parseFloat(order.filledPrice) * parseFloat(order.filledQuantity);
      const fee = parseFloat(order.fee);
      const pnl = order.side === 'sell' ? filled - fee : -(filled + fee);
      dailyPnl.set(day, (dailyPnl.get(day) ?? 0) + pnl);
    }

    return dailyPnl;
  }

  private pearsonCorrelation(seriesA: Map<string, number>, seriesB: Map<string, number>): number {
    // Intersect on common dates
    const commonDates = [...seriesA.keys()].filter((d) => seriesB.has(d));
    const n = commonDates.length;

    if (n < 2) return 0;

    const xs = commonDates.map((d) => seriesA.get(d)!);
    const ys = commonDates.map((d) => seriesB.get(d)!);

    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denom = Math.sqrt(denomX * denomY);
    return denom === 0 ? 0 : num / denom;
  }
}
