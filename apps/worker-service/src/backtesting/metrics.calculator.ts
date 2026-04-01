import type { Trade, BacktestMetrics, EquityPoint } from './backtesting.types';

const TRADING_DAYS_PER_YEAR = 252;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Computes all performance metrics from a completed list of trades and equity curve.
 */
export function calculateMetrics(
  trades: Trade[],
  equityCurve: EquityPoint[],
  initialCapital: number,
  startTime: number,
  endTime: number,
): BacktestMetrics {
  if (trades.length === 0 || equityCurve.length === 0) {
    return emptyMetrics(initialCapital);
  }

  const finalEquity = equityCurve[equityCurve.length - 1].equity;
  const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;

  const durationMs = endTime - startTime;
  const yearsElapsed = durationMs / MS_PER_YEAR;
  const annualizedReturnPct =
    yearsElapsed > 0 ? (Math.pow(finalEquity / initialCapital, 1 / yearsElapsed) - 1) * 100 : 0;

  const dailyReturns = computeDailyReturns(equityCurve);
  const sharpeRatio = computeSharpe(dailyReturns);
  const sortinoRatio = computeSortino(dailyReturns);
  const maxDrawdownPct = computeMaxDrawdown(equityCurve);

  const winning = trades.filter((t) => t.pnl > 0);
  const losing = trades.filter((t) => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winning.length / trades.length) * 100 : 0;

  const grossProfit = winning.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losing.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgWinPct =
    winning.length > 0 ? winning.reduce((s, t) => s + t.pnlPercent, 0) / winning.length : 0;
  const avgLossPct =
    losing.length > 0 ? losing.reduce((s, t) => s + t.pnlPercent, 0) / losing.length : 0;

  const avgHoldingMs =
    trades.length > 0
      ? trades.reduce((s, t) => s + (t.exitTime - t.entryTime), 0) / trades.length
      : 0;

  return {
    totalReturnPct: round(totalReturnPct),
    annualizedReturnPct: round(annualizedReturnPct),
    sharpeRatio: round(sharpeRatio),
    sortinoRatio: round(sortinoRatio),
    maxDrawdownPct: round(maxDrawdownPct),
    winRate: round(winRate),
    profitFactor: round(profitFactor),
    totalTrades: trades.length,
    winningTrades: winning.length,
    losingTrades: losing.length,
    avgWinPct: round(avgWinPct),
    avgLossPct: round(avgLossPct),
    avgHoldingMs: Math.round(avgHoldingMs),
    finalEquity: round(finalEquity),
  };
}

function emptyMetrics(initialCapital: number): BacktestMetrics {
  return {
    totalReturnPct: 0,
    annualizedReturnPct: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    maxDrawdownPct: 0,
    winRate: 0,
    profitFactor: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    avgWinPct: 0,
    avgLossPct: 0,
    avgHoldingMs: 0,
    finalEquity: initialCapital,
  };
}

/**
 * Groups equity curve into daily buckets and computes per-day returns.
 * Falls back to per-candle returns when the window is shorter than a day.
 */
function computeDailyReturns(equityCurve: EquityPoint[]): number[] {
  if (equityCurve.length < 2) return [];

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const durationMs = equityCurve[equityCurve.length - 1].timestamp - equityCurve[0].timestamp;

  if (durationMs < MS_PER_DAY) {
    // Short window: use candle-to-candle returns
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].equity;
      if (prev > 0) returns.push((equityCurve[i].equity - prev) / prev);
    }
    return returns;
  }

  // Bucket by day
  const dayMap = new Map<number, number>();
  for (const point of equityCurve) {
    const dayKey = Math.floor(point.timestamp / MS_PER_DAY);
    dayMap.set(dayKey, point.equity);
  }

  const sortedDays = [...dayMap.entries()].sort((a, b) => a[0] - b[0]);
  const returns: number[] = [];
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = sortedDays[i - 1][1];
    if (prev > 0) returns.push((sortedDays[i][1] - prev) / prev);
  }
  return returns;
}

function computeSharpe(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

function computeSortino(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const downside = dailyReturns.filter((r) => r < 0);
  if (downside.length === 0) return mean > 0 ? Infinity : 0;
  const downsideVariance = downside.reduce((s, r) => s + r * r, 0) / downside.length;
  const downsideStd = Math.sqrt(downsideVariance);
  if (downsideStd === 0) return 0;
  return (mean / downsideStd) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

function computeMaxDrawdown(equityCurve: EquityPoint[]): number {
  let peak = equityCurve[0].equity;
  let maxDd = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const dd = peak > 0 ? ((peak - point.equity) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

function round(value: number, decimals = 4): number {
  if (!isFinite(value)) return value;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
