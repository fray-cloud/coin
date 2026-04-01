import { EMA, RSI, MACD, ATR } from 'technicalindicators';
import type {
  ITradingStrategy,
  StrategyEvaluation,
  CandleOHLCV,
  MultiTimeframeData,
} from '../strategy.interface';

/**
 * Multi-Timeframe Confluence Strategy
 *
 * Three-layer confluence model:
 *
 *   Layer 1 — Macro bias (htf2, e.g. 1d):
 *     EMA(20) vs EMA(50) slope determines overall directional bias.
 *     +1 = uptrend, -1 = downtrend, 0 = neutral/flat.
 *
 *   Layer 2 — Intermediate momentum (htf1, e.g. 4h):
 *     MACD crossover or RSI momentum confirms the macro bias.
 *     A buy signal here means intermediate momentum aligns with macro.
 *
 *   Layer 3 — Entry timing (primary, e.g. 1h):
 *     RSI oversold/overbought for precise entry.
 *     Volume confirmation: current volume > SMA(volume) multiplied by volumeMultiplier.
 *
 * Signal requires all three layers to agree:
 *   Buy:  macro bias = bull  AND  htf momentum = bullish  AND  primary RSI oversold  AND  volume surge
 *   Sell: macro bias = bear  AND  htf momentum = bearish  AND  primary RSI overbought AND  volume surge
 *
 * Fallback (no higher timeframe data): single-timeframe RSI + MACD with volume.
 *
 * ATR is used to report stop-loss distance context in indicatorValues.
 */
export class MultiTimeframeStrategy implements ITradingStrategy {
  readonly type = 'multi-timeframe';

  evaluate(
    closePrices: number[],
    config: Record<string, unknown>,
    candles?: CandleOHLCV,
    multiTimeframe?: MultiTimeframeData,
  ): StrategyEvaluation {
    const emaMacroPeriod1 = (config.emaMacroPeriod1 as number) || 20;
    const emaMacroPeriod2 = (config.emaMacroPeriod2 as number) || 50;
    const htfMacdFast = (config.htfMacdFast as number) || 12;
    const htfMacdSlow = (config.htfMacdSlow as number) || 26;
    const htfMacdSignal = (config.htfMacdSignal as number) || 9;
    const htfRsiPeriod = (config.htfRsiPeriod as number) || 14;
    const htfRsiOversold = (config.htfRsiOversold as number) || 40;
    const htfRsiOverbought = (config.htfRsiOverbought as number) || 60;
    const primaryRsiPeriod = (config.primaryRsiPeriod as number) || 14;
    const primaryRsiOversold = (config.primaryRsiOversold as number) || 35;
    const primaryRsiOverbought = (config.primaryRsiOverbought as number) || 65;
    const atrPeriod = (config.atrPeriod as number) || 14;
    const volumeMultiplier = (config.volumeMultiplier as number) || 1.2;
    const volumeLookback = (config.volumeLookback as number) || 20;
    const requireVolume = (config.requireVolume as boolean) !== false; // default on

    const minRequired = Math.max(
      emaMacroPeriod2,
      htfMacdSlow + htfMacdSignal,
      primaryRsiPeriod + 1,
    );

    if (closePrices.length < minRequired) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: {},
        reason: `Not enough data: need ${minRequired}, got ${closePrices.length}`,
      };
    }

    // ================================================================
    // Layer 1: Macro bias from daily (htf2) EMA slope
    // ================================================================
    let macroBias = 0; // +1 bull, -1 bear, 0 neutral
    let macroEmaShort = 0;
    let macroEmaLong = 0;

    const macroData = multiTimeframe?.htf2;
    if (macroData && macroData.close.length >= emaMacroPeriod2) {
      const ema1 = EMA.calculate({ values: macroData.close, period: emaMacroPeriod1 });
      const ema2 = EMA.calculate({ values: macroData.close, period: emaMacroPeriod2 });
      macroEmaShort = ema1[ema1.length - 1];
      macroEmaLong = ema2[ema2.length - 1];
      const prevEmaShort = ema1[ema1.length - 2] ?? macroEmaShort;
      // Uptrend: EMA short above EMA long and rising
      if (macroEmaShort > macroEmaLong && macroEmaShort >= prevEmaShort) {
        macroBias = 1;
      } else if (macroEmaShort < macroEmaLong && macroEmaShort <= prevEmaShort) {
        macroBias = -1;
      }
    } else {
      // Fallback: derive macro bias from primary close prices (downgraded signal quality)
      const ema1 = EMA.calculate({ values: closePrices, period: emaMacroPeriod1 });
      const ema2 = EMA.calculate({ values: closePrices, period: emaMacroPeriod2 });
      macroEmaShort = ema1[ema1.length - 1];
      macroEmaLong = ema2[ema2.length - 1];
      macroBias = macroEmaShort > macroEmaLong ? 1 : macroEmaShort < macroEmaLong ? -1 : 0;
    }

    // ================================================================
    // Layer 2: Intermediate momentum from 4h (htf1)
    // ================================================================
    let htfMomentum = 0; // +1 bullish, -1 bearish, 0 neutral
    let htfRsiValue = 50;
    let htfMacdHistogram = 0;

    const htfData = multiTimeframe?.htf1;
    if (htfData && htfData.close.length >= htfMacdSlow + htfMacdSignal) {
      // MACD crossover
      const macdResults = MACD.calculate({
        values: htfData.close,
        fastPeriod: htfMacdFast,
        slowPeriod: htfMacdSlow,
        signalPeriod: htfMacdSignal,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });
      if (macdResults.length >= 2) {
        const cur = macdResults[macdResults.length - 1];
        const prev = macdResults[macdResults.length - 2];
        htfMacdHistogram = cur.histogram ?? 0;
        if (cur.MACD != null && cur.signal != null && prev.MACD != null && prev.signal != null) {
          if (prev.MACD <= prev.signal && cur.MACD > cur.signal) htfMomentum = 1;
          else if (prev.MACD >= prev.signal && cur.MACD < cur.signal) htfMomentum = -1;
          // Even without a fresh crossover, use histogram direction as softer signal
          else if (htfMacdHistogram > 0) htfMomentum = 1;
          else if (htfMacdHistogram < 0) htfMomentum = -1;
        }
      }
      // RSI momentum as secondary confirmation
      if (htfData.close.length >= htfRsiPeriod + 1) {
        const htfRsi = RSI.calculate({ values: htfData.close, period: htfRsiPeriod });
        htfRsiValue = htfRsi[htfRsi.length - 1];
        if (htfMomentum === 0) {
          if (htfRsiValue <= htfRsiOversold) htfMomentum = 1;
          else if (htfRsiValue >= htfRsiOverbought) htfMomentum = -1;
        }
      }
    } else {
      // Fallback: use primary MACD as intermediate proxy
      const macdResults = MACD.calculate({
        values: closePrices,
        fastPeriod: htfMacdFast,
        slowPeriod: htfMacdSlow,
        signalPeriod: htfMacdSignal,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });
      if (macdResults.length > 0) {
        htfMacdHistogram = macdResults[macdResults.length - 1].histogram ?? 0;
        htfMomentum = htfMacdHistogram > 0 ? 1 : htfMacdHistogram < 0 ? -1 : 0;
      }
    }

    // ================================================================
    // Layer 3: Entry timing — primary RSI + volume confirmation
    // ================================================================
    const primaryRsi = RSI.calculate({ values: closePrices, period: primaryRsiPeriod });
    const currentRsi = primaryRsi[primaryRsi.length - 1];
    const isRsiOversold = currentRsi <= primaryRsiOversold;
    const isRsiOverbought = currentRsi >= primaryRsiOverbought;

    // Volume confirmation
    let volumeConfirmed = !requireVolume;
    const volume = candles?.volume;
    if (requireVolume && volume && volume.length >= volumeLookback + 1) {
      const recentVols = volume.slice(-volumeLookback - 1, -1);
      const avgVolume = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
      const currentVolume = volume[volume.length - 1];
      volumeConfirmed = currentVolume >= avgVolume * volumeMultiplier;
    }

    // ATR for stop-loss context
    let atrValue = 0;
    if (candles && candles.high.length >= atrPeriod) {
      const atrResults = ATR.calculate({
        high: candles.high,
        low: candles.low,
        close: candles.close,
        period: atrPeriod,
      });
      atrValue = atrResults.length > 0 ? atrResults[atrResults.length - 1] : 0;
    }

    const indicators: Record<string, number | string> = {
      macroBias,
      macroEmaShort: Math.round(macroEmaShort * 100) / 100,
      macroEmaLong: Math.round(macroEmaLong * 100) / 100,
      htfMomentum,
      htfRsi: Math.round(htfRsiValue * 100) / 100,
      htfMacdHistogram: Math.round(htfMacdHistogram * 100) / 100,
      primaryRsi: Math.round(currentRsi * 100) / 100,
      volumeConfirmed: volumeConfirmed ? 1 : 0,
      atr: Math.round(atrValue * 100) / 100,
      htfDataAvailable: multiTimeframe?.htf1 ? 1 : 0,
      macroDataAvailable: multiTimeframe?.htf2 ? 1 : 0,
    };

    // Confluence quality: how many layers agree
    const confluenceLayers = (multiTimeframe?.htf1 ? 1 : 0) + (multiTimeframe?.htf2 ? 1 : 0);
    // Confidence scales with number of real higher-TF feeds (max 3-layer = full quality)
    const layerBoost = confluenceLayers * 0.1;

    // ================================================================
    // Signal decision
    // ================================================================
    const allBullish = macroBias >= 0 && htfMomentum >= 0 && isRsiOversold;
    const allBearish = macroBias <= 0 && htfMomentum <= 0 && isRsiOverbought;
    const strongBullish = macroBias === 1 && htfMomentum === 1 && isRsiOversold;
    const strongBearish = macroBias === -1 && htfMomentum === -1 && isRsiOverbought;

    if (strongBullish && (!requireVolume || volumeConfirmed)) {
      const confidence =
        0.6 + layerBoost + ((primaryRsiOversold - currentRsi) / primaryRsiOversold) * 0.2;
      return {
        signal: 'buy',
        confidence: Math.min(confidence, 0.95),
        indicatorValues: indicators,
        reason: `[MTF Strong] Macro bull + 4h bull + RSI(${currentRsi.toFixed(1)}) oversold${volumeConfirmed ? ' + vol' : ''}`,
      };
    }

    if (allBullish && (!requireVolume || volumeConfirmed)) {
      const confidence =
        0.45 + layerBoost + ((primaryRsiOversold - currentRsi) / primaryRsiOversold) * 0.1;
      return {
        signal: 'buy',
        confidence: Math.min(confidence, 0.75),
        indicatorValues: indicators,
        reason: `[MTF Soft] Macro neutral/bull + momentum bull + RSI(${currentRsi.toFixed(1)}) oversold`,
      };
    }

    if (strongBearish && (!requireVolume || volumeConfirmed)) {
      const confidence =
        0.6 +
        layerBoost +
        ((currentRsi - primaryRsiOverbought) / (100 - primaryRsiOverbought)) * 0.2;
      return {
        signal: 'sell',
        confidence: Math.min(confidence, 0.95),
        indicatorValues: indicators,
        reason: `[MTF Strong] Macro bear + 4h bear + RSI(${currentRsi.toFixed(1)}) overbought${volumeConfirmed ? ' + vol' : ''}`,
      };
    }

    if (allBearish && (!requireVolume || volumeConfirmed)) {
      const confidence =
        0.45 +
        layerBoost +
        ((currentRsi - primaryRsiOverbought) / (100 - primaryRsiOverbought)) * 0.1;
      return {
        signal: 'sell',
        confidence: Math.min(confidence, 0.75),
        indicatorValues: indicators,
        reason: `[MTF Soft] Macro neutral/bear + momentum bear + RSI(${currentRsi.toFixed(1)}) overbought`,
      };
    }

    const reasons: string[] = [];
    if (macroBias === 0) reasons.push('macro neutral');
    if (htfMomentum === 0) reasons.push('htf neutral');
    if (!isRsiOversold && !isRsiOverbought)
      reasons.push(`primary RSI neutral (${currentRsi.toFixed(1)})`);
    if (requireVolume && !volumeConfirmed) reasons.push('no volume surge');

    return {
      signal: 'hold',
      confidence: 0,
      indicatorValues: indicators,
      reason: reasons.join('; ') || 'no MTF confluence',
    };
  }
}
