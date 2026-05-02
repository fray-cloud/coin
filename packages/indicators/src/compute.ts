import { EMA, RSI, BollingerBands, MACD, ATR } from 'technicalindicators';
import type { Candle, IndicatorRow, IndicatorSeries } from '@coin/types';

export interface ComputeOptions {
  emaPeriods?: [number, number, number];
  rsiPeriod?: number;
  bbPeriod?: number;
  bbStdDev?: number;
  macdFast?: number;
  macdSlow?: number;
  macdSignal?: number;
  atrPeriod?: number;
}

const DEFAULTS: Required<ComputeOptions> = {
  emaPeriods: [20, 50, 200],
  rsiPeriod: 14,
  bbPeriod: 20,
  bbStdDev: 2,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  atrPeriod: 14,
};

/**
 * Compute the standard indicator suite over an OHLCV candle window. The
 * returned series is index-aligned with the input — one IndicatorRow per
 * input candle. Indicator values inside the warmup period (when there isn't
 * enough prior data to produce a stable value) are returned as `null` so the
 * caller can pass that semantics through to consumers (LLM prompts, UI).
 *
 * Wraps the `technicalindicators` library so the rest of the codebase never
 * imports it directly. If we ever swap the engine, only this file changes.
 */
export function computeIndicators(candles: Candle[], opts: ComputeOptions = {}): IndicatorSeries {
  const o = { ...DEFAULTS, ...opts };
  const n = candles.length;
  const closes = candles.map((c) => Number(c.close));
  const highs = candles.map((c) => Number(c.high));
  const lows = candles.map((c) => Number(c.low));

  const [pE1, pE2, pE3] = o.emaPeriods;
  const ema1 = EMA.calculate({ period: pE1, values: closes });
  const ema2 = EMA.calculate({ period: pE2, values: closes });
  const ema3 = EMA.calculate({ period: pE3, values: closes });
  const rsi = RSI.calculate({ period: o.rsiPeriod, values: closes });
  const bb = BollingerBands.calculate({
    period: o.bbPeriod,
    stdDev: o.bbStdDev,
    values: closes,
  });
  const macd = MACD.calculate({
    fastPeriod: o.macdFast,
    slowPeriod: o.macdSlow,
    signalPeriod: o.macdSignal,
    values: closes,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const atr = ATR.calculate({ period: o.atrPeriod, high: highs, low: lows, close: closes });

  // Each output array is shorter than the input by (period - 1). To align,
  // we right-justify the output: the LAST element corresponds to candles[n-1],
  // and the first (n - output.length) candles get null.
  const align = <T>(values: T[]): (T | null)[] => {
    const padded: (T | null)[] = new Array(n).fill(null);
    const offset = n - values.length;
    for (let i = 0; i < values.length; i++) {
      padded[offset + i] = values[i];
    }
    return padded;
  };

  const ema1A = align(ema1);
  const ema2A = align(ema2);
  const ema3A = align(ema3);
  const rsiA = align(rsi);
  const bbA = align(bb);
  const macdA = align(macd);
  const atrA = align(atr);

  const rows: IndicatorRow[] = [];
  for (let i = 0; i < n; i++) {
    const b = bbA[i];
    const m = macdA[i];
    rows.push({
      ema20: ema1A[i] ?? null,
      ema50: ema2A[i] ?? null,
      ema200: ema3A[i] ?? null,
      rsi14: rsiA[i] ?? null,
      bbUpper: b?.upper ?? null,
      bbMiddle: b?.middle ?? null,
      bbLower: b?.lower ?? null,
      macd: m?.MACD ?? null,
      macdSignal: m?.signal ?? null,
      macdHistogram: m?.histogram ?? null,
      atr14: atrA[i] ?? null,
    });
  }

  return { rows };
}
