import { ADX, EMA, RSI, BollingerBands, Stochastic, WilliamsR } from 'technicalindicators';
import type { ITradingStrategy, StrategyEvaluation, CandleOHLCV } from '../strategy.interface';

type MarketRegime = 'bull' | 'bear' | 'sideways';

/**
 * Trend Regime Strategy: detects the current market regime and applies
 * the most appropriate sub-strategy for that regime.
 *
 * Regime detection (requires OHLCV):
 *   - Bull:     EMA(short) > EMA(long)  AND ADX > adxThreshold  AND +DI > -DI
 *   - Bear:     EMA(short) < EMA(long)  AND ADX > adxThreshold  AND -DI > +DI
 *   - Sideways: ADX < adxThreshold  (low directional strength)
 *
 * Sub-strategies:
 *   - Bull:     EMA crossover momentum + RSI dip buying
 *                 Buy when EMA(fast) crosses above EMA(slow) + RSI not overbought
 *                 Sell when RSI overbought or EMA crosses bearish
 *   - Bear:     Conservative — sell/hold only; buy signals suppressed
 *                 Sell on RSI overbought bounce + +DI weakening
 *   - Sideways: Mean-reversion via Bollinger Bands + Stochastic / Williams %R
 *                 Buy: price < lower BB + Stochastic %K oversold + Williams %R < -80
 *                 Sell: price > upper BB + Stochastic %K overbought + Williams %R > -20
 */
export class TrendRegimeStrategy implements ITradingStrategy {
  readonly type = 'trend-regime';

  evaluate(
    closePrices: number[],
    config: Record<string, unknown>,
    candles?: CandleOHLCV,
  ): StrategyEvaluation {
    const emaShortPeriod = (config.emaShortPeriod as number) || 20;
    const emaLongPeriod = (config.emaLongPeriod as number) || 50;
    const adxPeriod = (config.adxPeriod as number) || 14;
    const adxThreshold = (config.adxThreshold as number) || 20;
    const rsiPeriod = (config.rsiPeriod as number) || 14;
    const rsiOversold = (config.rsiOversold as number) || 35;
    const rsiOverbought = (config.rsiOverbought as number) || 65;
    const bbPeriod = (config.bbPeriod as number) || 20;
    const bbStdDev = (config.bbStdDev as number) || 2;
    const stochPeriod = (config.stochPeriod as number) || 14;
    const stochSignalPeriod = (config.stochSignalPeriod as number) || 3;
    const stochOversold = (config.stochOversold as number) || 20;
    const stochOverbought = (config.stochOverbought as number) || 80;
    const wrPeriod = (config.wrPeriod as number) || 14;

    const minRequired = Math.max(
      emaLongPeriod,
      rsiPeriod + 1,
      bbPeriod,
      stochPeriod + stochSignalPeriod,
    );

    if (closePrices.length < minRequired) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: {},
        reason: `Not enough data: need ${minRequired}, got ${closePrices.length}`,
      };
    }

    const currentPrice = closePrices[closePrices.length - 1];

    // --- EMA trend ---
    const emaShortValues = EMA.calculate({ values: closePrices, period: emaShortPeriod });
    const emaLongValues = EMA.calculate({ values: closePrices, period: emaLongPeriod });
    const emaShort = emaShortValues[emaShortValues.length - 1];
    const emaLong = emaLongValues[emaLongValues.length - 1];

    const prevEmaShort = emaShortValues[emaShortValues.length - 2] ?? emaShort;
    const prevEmaLong = emaLongValues[emaLongValues.length - 2] ?? emaLong;

    // --- ADX (regime gating) ---
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

    // --- Detect regime ---
    let regime: MarketRegime;
    if (adxValue === 0) {
      // Fallback if ADX unavailable: use EMA relationship
      regime = emaShort > emaLong ? 'bull' : emaShort < emaLong ? 'bear' : 'sideways';
    } else if (adxValue >= adxThreshold) {
      regime = pdi >= mdi ? 'bull' : 'bear';
    } else {
      regime = 'sideways';
    }

    // --- RSI ---
    const rsiValues = RSI.calculate({ values: closePrices, period: rsiPeriod });
    const currentRsi = rsiValues[rsiValues.length - 1];

    const baseIndicators: Record<string, number> = {
      regime: regime === 'bull' ? 1 : regime === 'bear' ? -1 : 0,
      adx: Math.round(adxValue * 100) / 100,
      pdi: Math.round(pdi * 100) / 100,
      mdi: Math.round(mdi * 100) / 100,
      emaShort: Math.round(emaShort * 100) / 100,
      emaLong: Math.round(emaLong * 100) / 100,
      rsi: Math.round(currentRsi * 100) / 100,
    };

    // ================================================================
    // BULL regime: EMA-crossover momentum + RSI dip buying
    // ================================================================
    if (regime === 'bull') {
      const emaBullishCross = prevEmaShort <= prevEmaLong && emaShort > emaLong;
      const emaBearishCross = prevEmaShort >= prevEmaLong && emaShort < emaLong;

      if (emaBullishCross && currentRsi < rsiOverbought) {
        const confidence = 0.6 + Math.min((adxValue - adxThreshold) / (adxThreshold * 2), 0.3);
        return {
          signal: 'buy',
          confidence: Math.min(confidence, 0.9),
          indicatorValues: { ...baseIndicators, crossType: 1 },
          reason: `[Bull] EMA(${emaShortPeriod}) bullish cross, RSI(${currentRsi.toFixed(1)}), ADX(${adxValue.toFixed(1)})`,
        };
      }

      if (currentRsi <= rsiOversold && emaShort > emaLong) {
        const confidence = 0.5 + ((rsiOversold - currentRsi) / rsiOversold) * 0.3;
        return {
          signal: 'buy',
          confidence: Math.min(confidence, 0.8),
          indicatorValues: baseIndicators,
          reason: `[Bull] RSI dip(${currentRsi.toFixed(1)}) in uptrend, ADX(${adxValue.toFixed(1)})`,
        };
      }

      if (emaBearishCross || currentRsi >= rsiOverbought) {
        const confidence = emaBearishCross ? 0.65 : 0.45;
        return {
          signal: 'sell',
          confidence,
          indicatorValues: { ...baseIndicators, crossType: -1 },
          reason: `[Bull] ${emaBearishCross ? 'EMA bearish cross' : `RSI overbought(${currentRsi.toFixed(1)})`}`,
        };
      }
    }

    // ================================================================
    // BEAR regime: conservative — only sell on bounces
    // ================================================================
    if (regime === 'bear') {
      if (currentRsi >= rsiOverbought && pdi < mdi) {
        return {
          signal: 'sell',
          confidence: 0.6 + ((currentRsi - rsiOverbought) / (100 - rsiOverbought)) * 0.3,
          indicatorValues: baseIndicators,
          reason: `[Bear] RSI overbought(${currentRsi.toFixed(1)}) + -DI dominates, ADX(${adxValue.toFixed(1)})`,
        };
      }
      // Buy signals suppressed in bear market
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: baseIndicators,
        reason: `[Bear] Awaiting reversal signal, ADX(${adxValue.toFixed(1)})`,
      };
    }

    // ================================================================
    // SIDEWAYS regime: Bollinger Bands + Stochastic + Williams %R mean-reversion
    // ================================================================
    const bbValues = BollingerBands.calculate({
      values: closePrices,
      period: bbPeriod,
      stdDev: bbStdDev,
    });
    const currentBB = bbValues[bbValues.length - 1];
    const bbWidth = currentBB ? currentBB.upper - currentBB.lower : 0;

    const indicators: Record<string, number | string> = {
      ...baseIndicators,
      bbUpper: currentBB ? Math.round(currentBB.upper * 100) / 100 : 0,
      bbLower: currentBB ? Math.round(currentBB.lower * 100) / 100 : 0,
    };

    let stochK = 50;
    let stochD = 50;
    if (candles && candles.high.length >= stochPeriod + stochSignalPeriod) {
      const stochResults = Stochastic.calculate({
        high: candles.high,
        low: candles.low,
        close: candles.close,
        period: stochPeriod,
        signalPeriod: stochSignalPeriod,
      });
      if (stochResults.length > 0) {
        const last = stochResults[stochResults.length - 1];
        stochK = last.k;
        stochD = last.d;
      }
    }
    indicators.stochK = Math.round(stochK * 100) / 100;
    indicators.stochD = Math.round(stochD * 100) / 100;

    let wrValue = -50;
    if (candles && candles.high.length >= wrPeriod) {
      const wrResults = WilliamsR.calculate({
        high: candles.high,
        low: candles.low,
        close: candles.close,
        period: wrPeriod,
      });
      if (wrResults.length > 0) {
        wrValue = wrResults[wrResults.length - 1];
      }
    }
    indicators.williamsR = Math.round(wrValue * 100) / 100;

    // Sideways buy: price below lower BB + Stochastic oversold + Williams %R oversold
    if (currentBB && currentPrice < currentBB.lower && stochK <= stochOversold && wrValue <= -80) {
      const bbConfidence =
        bbWidth > 0 ? Math.min((currentBB.lower - currentPrice) / bbWidth, 0.3) : 0;
      const stochConfidence = Math.min((stochOversold - stochK) / stochOversold, 0.2);
      return {
        signal: 'buy',
        confidence: 0.45 + bbConfidence + stochConfidence,
        indicatorValues: indicators,
        reason: `[Sideways] Price below BB lower, Stoch(${stochK.toFixed(1)}), WR(${wrValue.toFixed(1)})`,
      };
    }

    // Sideways sell: price above upper BB + Stochastic overbought + Williams %R overbought
    if (
      currentBB &&
      currentPrice > currentBB.upper &&
      stochK >= stochOverbought &&
      wrValue >= -20
    ) {
      const bbConfidence =
        bbWidth > 0 ? Math.min((currentPrice - currentBB.upper) / bbWidth, 0.3) : 0;
      const stochConfidence = Math.min((stochK - stochOverbought) / (100 - stochOverbought), 0.2);
      return {
        signal: 'sell',
        confidence: 0.45 + bbConfidence + stochConfidence,
        indicatorValues: indicators,
        reason: `[Sideways] Price above BB upper, Stoch(${stochK.toFixed(1)}), WR(${wrValue.toFixed(1)})`,
      };
    }

    return {
      signal: 'hold',
      confidence: 0,
      indicatorValues: indicators,
      reason: `[Sideways] No mean-reversion trigger, ADX(${adxValue.toFixed(1)})`,
    };
  }
}
