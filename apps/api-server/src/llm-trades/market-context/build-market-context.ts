import type { Candle, IndicatorRow, FundingRateRecord, OpenInterestPoint } from '@coin/types';
import { computeIndicators } from '@coin/indicators';
import type {
  EnrichedCandleRow,
  MarketContext,
  StructureSummary,
  SentimentSummary,
  FundingSentiment,
  OpenInterestSentiment,
} from './market-context.types';

/** Backend always fetches at least this many candles so EMA200 is stable. */
export const MIN_FETCH_COUNT = 220;

export interface BuildDeps {
  fetchCandles(symbol: string, interval: string, count: number): Promise<Candle[]>;
  fetchFundingHistory(symbol: string, limit: number): Promise<FundingRateRecord[]>;
  fetchCurrentFunding(
    symbol: string,
  ): Promise<{ symbol: string; lastFundingRate: string; nextFundingTime: number }>;
  fetchOpenInterestHistory(
    symbol: string,
    period: '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d',
    limit: number,
  ): Promise<OpenInterestPoint[]>;
}

export interface BuildOptions {
  symbol: string;
  interval: string;
  promptCandleCount: number;
}

/**
 * Build a complete MarketContext for an LLM signal request. Pure modulo deps:
 *   1. Fetch enough candles to compute EMA200.
 *   2. Compute indicator series, take last `promptCandleCount` rows.
 *   3. Derive structure (swing high/low, ATR%, suggested SL%) from those rows.
 *   4. Fetch funding/OI in parallel; tolerate failures (degraded mode → null).
 *
 * The function never throws on sentiment failure — degraded mode lets the
 * signal proceed without it. Only candle-fetch errors propagate.
 */
export async function buildMarketContext(
  opts: BuildOptions,
  deps: BuildDeps,
): Promise<MarketContext> {
  const { symbol, interval, promptCandleCount } = opts;
  const fetchCount = Math.max(MIN_FETCH_COUNT, promptCandleCount + 50);

  const candles = await deps.fetchCandles(symbol, interval, fetchCount);
  if (candles.length === 0) {
    throw new Error(`No candles for ${symbol} @ ${interval}`);
  }

  const series = computeIndicators(candles);
  const startIdx = Math.max(0, candles.length - promptCandleCount);
  const promptCandles = candles.slice(startIdx);
  const promptRows = series.rows.slice(startIdx);

  const enriched: EnrichedCandleRow[] = promptCandles.map((c, i) => ({
    t: formatTimestamp(c.timestamp, interval),
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
    v: c.volume,
    ...promptRows[i],
  }));

  const structure = computeStructure(enriched, promptRows);

  const sentiment = await fetchSentiment(symbol, interval, deps);

  return { symbol, interval, candles: enriched, structure, sentiment };
}

// ── Internals ──────────────────────────────────────────────────────

const PRECISION_BY_INTERVAL: Record<string, 'minute' | 'hour' | 'day'> = {
  '1m': 'minute',
  '3m': 'minute',
  '5m': 'minute',
  '15m': 'minute',
  '30m': 'minute',
  '1h': 'hour',
  '2h': 'hour',
  '4h': 'hour',
  '6h': 'hour',
  '8h': 'hour',
  '12h': 'hour',
  '1d': 'day',
  '3d': 'day',
  '1w': 'day',
};

/** ISO 8601 truncated to the given interval's precision. */
export function formatTimestamp(epochMs: number, interval: string): string {
  const d = new Date(epochMs);
  const iso = d.toISOString(); // 2026-05-02T15:23:00.000Z
  const precision = PRECISION_BY_INTERVAL[interval] ?? 'minute';
  if (precision === 'day') return iso.slice(0, 10); // 2026-05-02
  if (precision === 'hour') return iso.slice(0, 13) + ':00:00Z'; // 2026-05-02T15:00:00Z
  return iso.slice(0, 17) + '00Z'; // 2026-05-02T15:23:00Z
}

function computeStructure(enriched: EnrichedCandleRow[], rows: IndicatorRow[]): StructureSummary {
  let swingHigh: number | null = null;
  let swingHighAt: string | null = null;
  let swingLow: number | null = null;
  let swingLowAt: string | null = null;
  for (const row of enriched) {
    const high = Number(row.h);
    const low = Number(row.l);
    if (swingHigh == null || high > swingHigh) {
      swingHigh = high;
      swingHighAt = row.t;
    }
    if (swingLow == null || low < swingLow) {
      swingLow = low;
      swingLowAt = row.t;
    }
  }

  const lastRow = enriched[enriched.length - 1];
  const lastClose = lastRow ? Number(lastRow.c) : 0;
  const lastAtr = rows[rows.length - 1]?.atr14 ?? null;

  let atrPct: number | null = null;
  let suggestedSlPct: number | null = null;
  if (lastAtr != null && lastClose > 0) {
    atrPct = (lastAtr / lastClose) * 100;
    suggestedSlPct = (1.5 * lastAtr) / lastClose; // 1.5× ATR as SL distance default
  }

  return { swingHigh, swingHighAt, swingLow, swingLowAt, atrPct, suggestedSlPct };
}

async function fetchSentiment(
  symbol: string,
  interval: string,
  deps: BuildDeps,
): Promise<SentimentSummary> {
  const fundingP = fetchFundingSafely(symbol, deps);
  const oiP = fetchOpenInterestSafely(symbol, interval, deps);
  const [fundingRate, openInterest] = await Promise.all([fundingP, oiP]);
  return { fundingRate, openInterest };
}

async function fetchFundingSafely(
  symbol: string,
  deps: BuildDeps,
): Promise<FundingSentiment | null> {
  try {
    const [history, current] = await Promise.all([
      deps.fetchFundingHistory(symbol, 8),
      deps.fetchCurrentFunding(symbol),
    ]);
    const lastSettlements = history.map((h) => ({
      t: new Date(h.fundingTime).toISOString().slice(0, 19) + 'Z',
      rate: h.fundingRate,
    }));
    const avg7d = computeAvg7d(history);
    return {
      current: current.lastFundingRate,
      nextFundingTime: current.nextFundingTime,
      lastSettlements,
      avg7d,
    };
  } catch {
    return null;
  }
}

function computeAvg7d(history: FundingRateRecord[]): number | null {
  // Funding settles every 8h → 21 settlements per 7 days.
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter((h) => h.fundingTime >= cutoff);
  if (recent.length === 0) return null;
  const sum = recent.reduce((s, r) => s + Number(r.fundingRate), 0);
  return sum / recent.length;
}

async function fetchOpenInterestSafely(
  symbol: string,
  interval: string,
  deps: BuildDeps,
): Promise<OpenInterestSentiment | null> {
  // OI history granularity scales with the user's candle interval, capped at 1h
  // to keep the series readable (24 points = 24h window at 1h granularity).
  const period = oiPeriodFor(interval);
  try {
    const history = await deps.fetchOpenInterestHistory(symbol, period, 24);
    if (history.length === 0) return { currentUsdt: null, change24hPct: null, history: [] };
    const first = Number(history[0].sumOpenInterestValueUsdt);
    const last = Number(history[history.length - 1].sumOpenInterestValueUsdt);
    const change24hPct = first > 0 ? ((last - first) / first) * 100 : null;
    return {
      currentUsdt: last,
      change24hPct,
      history: history.map((p) => ({
        t: new Date(p.timestamp).toISOString().slice(0, 19) + 'Z',
        oi: Number(p.sumOpenInterestValueUsdt),
      })),
    };
  } catch {
    return null;
  }
}

function oiPeriodFor(
  interval: string,
): '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' {
  switch (interval) {
    case '1m':
    case '3m':
    case '5m':
      return '5m';
    case '15m':
      return '15m';
    case '30m':
      return '30m';
    case '1h':
    case '2h':
      return '1h';
    case '4h':
      return '4h';
    default:
      return '1h';
  }
}
