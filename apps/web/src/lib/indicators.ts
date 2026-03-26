/**
 * Technical indicator calculations for strategy charts.
 * All functions take an array of closing prices and return indicator values.
 */

function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let prev = data[0];
  result.push(prev);

  for (let i = 1; i < data.length; i++) {
    prev = data[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j];
    }
    result.push(sum / period);
  }
  return result;
}

export function calcRSI(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (closes.length < period + 1) {
    return closes.map(() => null);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  // Fill nulls for initial period
  for (let i = 0; i <= period; i++) {
    result.push(i === period ? 100 - 100 / (1 + avgGain / (avgLoss || 0.0001)) : null);
  }

  // Smoothed RSI
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / (avgLoss || 0.0001);
    result.push(100 - 100 / (1 + rs));
  }

  return result;
}

export interface MACDResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export function calcMACD(
  closes: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
): MACDResult[] {
  if (closes.length < slowPeriod) {
    return closes.map(() => ({ macd: null, signal: null, histogram: null }));
  }

  const fastEMA = ema(closes, fastPeriod);
  const slowEMA = ema(closes, slowPeriod);

  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = ema(macdLine, signalPeriod);

  return macdLine.map((m, i) => {
    const s = signalLine[i];
    // Only show values after slow period warmup
    if (i < slowPeriod - 1) {
      return { macd: null, signal: null, histogram: null };
    }
    return {
      macd: m,
      signal: s,
      histogram: m - s,
    };
  });
}

export interface BollingerResult {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export function calcBollinger(closes: number[], period: number, stdDev: number): BollingerResult[] {
  const middle = sma(closes, period);

  return middle.map((m, i) => {
    if (m === null) return { upper: null, middle: null, lower: null };

    // Standard deviation
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSq += (closes[j] - m) ** 2;
    }
    const sd = Math.sqrt(sumSq / period);

    return {
      upper: m + stdDev * sd,
      middle: m,
      lower: m - stdDev * sd,
    };
  });
}
