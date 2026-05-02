import type { IndicatorRow } from '@coin/types';

export interface EnrichedCandleRow extends IndicatorRow {
  /** ISO 8601 truncated to interval precision. */
  t: string;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}

export interface StructureSummary {
  swingHigh: number | null;
  swingHighAt: string | null;
  swingLow: number | null;
  swingLowAt: string | null;
  /** Last ATR value as a percentage of last close. Useful for "X% volatility right now". */
  atrPct: number | null;
  /** Suggested SL distance as a fraction of entry (e.g., 0.015 for 1.5%). */
  suggestedSlPct: number | null;
}

export interface FundingSentiment {
  current: string | null;
  nextFundingTime: number | null;
  lastSettlements: Array<{ t: string; rate: string }>;
  avg7d: number | null;
}

export interface OpenInterestSentiment {
  currentUsdt: number | null;
  change24hPct: number | null;
  history: Array<{ t: string; oi: number }>;
}

export interface SentimentSummary {
  fundingRate: FundingSentiment | null;
  openInterest: OpenInterestSentiment | null;
}

export interface MarketContext {
  symbol: string;
  interval: string;
  candles: EnrichedCandleRow[];
  structure: StructureSummary;
  sentiment: SentimentSummary;
}
