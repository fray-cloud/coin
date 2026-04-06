import { RSI, MACD, BollingerBands, ADX, EMA } from 'technicalindicators';
import type { ITradingStrategy, StrategyEvaluation, CandleOHLCV } from '../strategy.interface';

/**
 * Combination Strategy: RSI + MACD confirmation with ADX trend filter
 * and Bollinger Bands for dynamic stop-loss context.
 *
 * Buy logic:
 *   - RSI is oversold (< oversold threshold)
 *   - MACD has bullish crossover (MACD line crosses above signal)
 *   - If adxFilter enabled: ADX > adxThreshold (confirmed trend)
 *   - Optional: EMA short > EMA long (uptrend filter)
 *
 * Sell logic:
 *   - RSI is overbought (> overbought threshold)
 *   - MACD has bearish crossover (MACD line crosses below signal)
 *
 * Confidence is boosted by:
 *   - Price near lower BB band on buy / near upper BB on sell
 *   - Strong ADX reading
 */
export class CombinationStrategy implements ITradingStrategy {
  readonly type = 'combination';

  evaluate(
    closePrices: number[],
    config: Record<string, unknown>,
    candles?: CandleOHLCV,
  ): StrategyEvaluation {
    const rsiPeriod = (config.rsiPeriod as number) || 14;
    const rsiOversold = (config.rsiOversold as number) || 30;
    const rsiOverbought = (config.rsiOverbought as number) || 70;
    const macdFast = (config.macdFast as number) || 12;
    const macdSlow = (config.macdSlow as number) || 26;
    const macdSignal = (config.macdSignal as number) || 9;
    const bbPeriod = (config.bbPeriod as number) || 20;
    const bbStdDev = (config.bbStdDev as number) || 2;
    const adxPeriod = (config.adxPeriod as number) || 14;
    const adxThreshold = (config.adxThreshold as number) || 25;
    const adxFilter = (config.adxFilter as boolean) !== false; // default on
    const emaShortPeriod = (config.emaShortPeriod as number) || 20;
    const emaLongPeriod = (config.emaLongPeriod as number) || 50;
    const emaFilter = (config.emaFilter as boolean) === true; // default off

    const minRequired = Math.max(macdSlow + macdSignal, rsiPeriod + 1, bbPeriod, emaLongPeriod);

    if (closePrices.length < minRequired) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: {},
        reason: `Not enough data: need ${minRequired}, got ${closePrices.length}`,
      };
    }

    // --- RSI ---
    const rsiValues = RSI.calculate({ values: closePrices, period: rsiPeriod });
    const currentRsi = rsiValues[rsiValues.length - 1];

    // --- MACD ---
    const macdValues = MACD.calculate({
      values: closePrices,
      fastPeriod: macdFast,
      slowPeriod: macdSlow,
      signalPeriod: macdSignal,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    if (macdValues.length < 2) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: { rsi: currentRsi },
        reason: 'Not enough MACD data for crossover',
      };
    }
    const macdCurrent = macdValues[macdValues.length - 1];
    const macdPrevious = macdValues[macdValues.length - 2];

    if (
      macdCurrent.MACD == null ||
      macdCurrent.signal == null ||
      macdPrevious.MACD == null ||
      macdPrevious.signal == null
    ) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: { rsi: currentRsi },
        reason: 'MACD values unavailable',
      };
    }

    const bullishMacdCross =
      macdPrevious.MACD <= macdPrevious.signal && macdCurrent.MACD > macdCurrent.signal;
    const bearishMacdCross =
      macdPrevious.MACD >= macdPrevious.signal && macdCurrent.MACD < macdCurrent.signal;

    // --- Bollinger Bands ---
    const bbValues = BollingerBands.calculate({
      values: closePrices,
      period: bbPeriod,
      stdDev: bbStdDev,
    });
    const currentBB = bbValues[bbValues.length - 1];
    const currentPrice = closePrices[closePrices.length - 1];
    const bbWidth = currentBB ? currentBB.upper - currentBB.lower : 0;

    // --- ADX (requires OHLCV) ---
    let adxValue = 0;
    let pdi = 0;
    let mdi = 0;
    if (candles && candles.high.length >= adxPeriod * 2) {
      const adxResults = ADX.calculate({
        high: candles.high,
        low: candles.low,
        close: candles.close,
        period: adxPeriod,
      });
      if (adxResults.length > 0) {
        const last = adxResults[adxResults.length - 1];
        adxValue = last.adx;
        pdi = last.pdi;
        mdi = last.mdi;
      }
    }

    // --- EMA trend filter ---
    let emaShort = 0;
    let emaLong = 0;
    if (emaFilter) {
      const emaShortValues = EMA.calculate({ values: closePrices, period: emaShortPeriod });
      const emaLongValues = EMA.calculate({ values: closePrices, period: emaLongPeriod });
      emaShort = emaShortValues[emaShortValues.length - 1];
      emaLong = emaLongValues[emaLongValues.length - 1];
    }

    const indicators: Record<string, number> = {
      rsi: Math.round(currentRsi * 100) / 100,
      macd: Math.round((macdCurrent.MACD ?? 0) * 100) / 100,
      macdSignal: Math.round((macdCurrent.signal ?? 0) * 100) / 100,
      macdHistogram: Math.round((macdCurrent.histogram ?? 0) * 100) / 100,
      adx: Math.round(adxValue * 100) / 100,
    };
    if (currentBB) {
      indicators.bbUpper = Math.round(currentBB.upper * 100) / 100;
      indicators.bbMiddle = Math.round(currentBB.middle * 100) / 100;
      indicators.bbLower = Math.round(currentBB.lower * 100) / 100;
    }

    // --- Signal logic ---
    const isRsiOversold = currentRsi <= rsiOversold;
    const isRsiOverbought = currentRsi >= rsiOverbought;
    const isTrending = !adxFilter || adxValue === 0 || adxValue >= adxThreshold;
    const isUptrend = !emaFilter || emaShort > emaLong;
    const isDowntrend = !emaFilter || emaShort < emaLong;

    // Buy: RSI oversold + MACD bullish cross + optional trend filters
    if (isRsiOversold && bullishMacdCross && isTrending && isUptrend) {
      let confidence = 0.5;
      // Boost confidence if RSI deeply oversold
      confidence += ((rsiOversold - currentRsi) / rsiOversold) * 0.25;
      // Boost confidence if price is near / below lower BB (additional oversold confirmation)
      if (currentBB && bbWidth > 0 && currentPrice <= currentBB.lower) {
        confidence += Math.min((currentBB.lower - currentPrice) / bbWidth, 0.25);
      }
      // Boost confidence if ADX indicates strong trend
      if (adxValue > 0) {
        confidence += Math.min((adxValue - adxThreshold) / adxThreshold, 0.1);
      }
      return {
        signal: 'buy',
        confidence: Math.min(confidence, 1),
        indicatorValues: indicators,
        reason: `RSI(${currentRsi.toFixed(1)}) oversold + MACD bullish cross + ADX(${adxValue.toFixed(1)})`,
      };
    }

    // Sell: RSI overbought + MACD bearish cross + optional trend filters
    if (isRsiOverbought && bearishMacdCross && isTrending && isDowntrend) {
      let confidence = 0.5;
      confidence += ((currentRsi - rsiOverbought) / (100 - rsiOverbought)) * 0.25;
      if (currentBB && bbWidth > 0 && currentPrice >= currentBB.upper) {
        confidence += Math.min((currentPrice - currentBB.upper) / bbWidth, 0.25);
      }
      if (adxValue > 0) {
        confidence += Math.min((adxValue - adxThreshold) / adxThreshold, 0.1);
      }
      return {
        signal: 'sell',
        confidence: Math.min(confidence, 1),
        indicatorValues: indicators,
        reason: `RSI(${currentRsi.toFixed(1)}) overbought + MACD bearish cross + ADX(${adxValue.toFixed(1)})`,
      };
    }

    const reasons: string[] = [];
    if (!isRsiOversold && !isRsiOverbought) reasons.push(`RSI neutral (${currentRsi.toFixed(1)})`);
    if (!bullishMacdCross && !bearishMacdCross) reasons.push('no MACD crossover');
    if (adxFilter && adxValue > 0 && adxValue < adxThreshold)
      reasons.push(`ADX weak (${adxValue.toFixed(1)} < ${adxThreshold})`);

    return {
      signal: 'hold',
      confidence: 0,
      indicatorValues: indicators,
      reason: reasons.join('; ') || 'no confluence',
    };
  }
}
