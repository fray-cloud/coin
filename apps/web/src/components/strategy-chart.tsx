'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useCandles } from '@/hooks/use-candles';
import { useTickersStore } from '@/stores/use-tickers-store';
import { useStrategySignals } from '@/hooks/use-strategy-signals';
import { calcRSI, calcMACD, calcBollinger } from '@/lib/indicators';
import type { SeriesMarker, Time } from 'lightweight-charts';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

interface StrategyChartProps {
  exchange: string;
  symbol: string;
  strategyType: string;
  config: Record<string, unknown>;
  candleInterval?: string;
  strategyId?: string;
}

export function StrategyChart({
  exchange,
  symbol,
  strategyType,
  config,
  candleInterval,
  strategyId,
}: StrategyChartProps) {
  const [selectedInterval, setSelectedInterval] = useState(candleInterval || '1h');
  const chartRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const indicatorInstance = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { data: candles, isLoading } = useCandles(exchange, symbol, selectedInterval);
  const { data: signals } = useStrategySignals(strategyId);

  const tickerKey = `${exchange}:${symbol}`;
  const ticker = useTickersStore((s) => s.tickers.get(tickerKey));

  useEffect(() => {
    if (!chartRef.current || !candles || candles.length === 0) return;

    // Cleanup
    if (chartInstance.current) {
      chartInstance.current.remove();
      chartInstance.current = null;
      candleSeriesRef.current = null;
    }
    if (indicatorInstance.current) {
      indicatorInstance.current.remove();
      indicatorInstance.current = null;
    }

    const closes = candles.map((c) => Number(c.close));
    const times = candles.map((c) => (c.timestamp / 1000) as any);
    const needsSubChart = strategyType === 'rsi' || strategyType === 'macd';
    const candleHeight = needsSubChart ? 300 : 400;

    // --- Main candlestick chart ---
    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: candleHeight,
      layout: {
        attributionLogo: false,
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(243,244,246,0.1)' },
        horzLines: { color: 'rgba(243,244,246,0.1)' },
      },
      rightPriceScale: { borderVisible: false, minimumWidth: 80 },
      timeScale: { borderVisible: false, timeVisible: true, rightOffset: 0 },
      localization: {
        timeFormatter: (t: number) => {
          const d = new Date(t * 1000);
          return d.toLocaleString('ko-KR', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        },
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candleSeries.setData(
      candles.map((c) => ({
        time: (c.timestamp / 1000) as any,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      })),
    );

    // --- Bollinger Bands: overlay on main chart ---
    if (strategyType === 'bollinger') {
      const period = Number(config.period) || 20;
      const stdDev = Number(config.stdDev) || 2;
      const bb = calcBollinger(closes, period, stdDev);

      const upperData = bb
        .map((b, i) => (b.upper !== null ? { time: times[i], value: b.upper } : null))
        .filter(Boolean) as any[];
      const middleData = bb
        .map((b, i) => (b.middle !== null ? { time: times[i], value: b.middle } : null))
        .filter(Boolean) as any[];
      const lowerData = bb
        .map((b, i) => (b.lower !== null ? { time: times[i], value: b.lower } : null))
        .filter(Boolean) as any[];

      const upperSeries = chart.addLineSeries({
        color: 'rgba(59,130,246,0.5)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const middleSeries = chart.addLineSeries({
        color: 'rgba(59,130,246,0.8)',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const lowerSeries = chart.addLineSeries({
        color: 'rgba(59,130,246,0.5)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      upperSeries.setData(upperData);
      middleSeries.setData(middleData);
      lowerSeries.setData(lowerData);
    }

    // Add buy/sell markers from strategy signals
    if (signals && signals.length > 0) {
      const markers: SeriesMarker<Time>[] = signals
        .map((s) => {
          const time = (new Date(s.createdAt).getTime() / 1000) as Time;
          const isOrder = s.action === 'order_placed';
          if (s.signal === 'buy') {
            return {
              time,
              position: 'belowBar' as const,
              shape: 'arrowUp' as const,
              color: isOrder ? '#16a34a' : '#22c55e',
              text: 'BUY',
            };
          }
          return {
            time,
            position: 'aboveBar' as const,
            shape: 'arrowDown' as const,
            color: isOrder ? '#dc2626' : '#ef4444',
            text: 'SELL',
          };
        })
        .sort((a, b) => (a.time as number) - (b.time as number));
      candleSeries.setMarkers(markers);

      // Hover price line for markers
      let activePriceLine: ReturnType<typeof candleSeries.createPriceLine> | null = null;
      chart.subscribeCrosshairMove((param) => {
        if (activePriceLine) {
          candleSeries.removePriceLine(activePriceLine);
          activePriceLine = null;
        }
        if (!param.time) return;
        const hoveredSignal = signals.find((s) => {
          const sTime = Math.floor(new Date(s.createdAt).getTime() / 1000);
          return Math.abs(sTime - (param.time as number)) < 60 && s.price > 0;
        });
        if (hoveredSignal) {
          activePriceLine = candleSeries.createPriceLine({
            price: hoveredSignal.price,
            color: hoveredSignal.signal === 'buy' ? '#22c55e' : '#ef4444',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
          });
        }
      });
    }

    chart.timeScale().fitContent();
    chartInstance.current = chart;
    candleSeriesRef.current = candleSeries;

    // --- Sub-chart for RSI / MACD ---
    if (needsSubChart && indicatorRef.current) {
      const subChart = createChart(indicatorRef.current, {
        width: indicatorRef.current.clientWidth,
        height: 150,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: 'rgba(243,244,246,0.1)' },
          horzLines: { color: 'rgba(243,244,246,0.1)' },
        },
        rightPriceScale: { borderVisible: false, minimumWidth: 80 },
        timeScale: { visible: false, rightOffset: 0 },
      });

      if (strategyType === 'rsi') {
        const period = Number(config.period) || 14;
        const overbought = Number(config.overbought) || 70;
        const oversold = Number(config.oversold) || 30;
        const rsiValues = calcRSI(closes, period);

        const rsiSeries = subChart.addLineSeries({
          color: '#a855f7',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const rsiData = rsiValues.map((v, i) => ({
          time: times[i],
          value: v ?? 50,
        }));
        rsiSeries.setData(rsiData);

        // Overbought/Oversold lines
        const obSeries = subChart.addLineSeries({
          color: 'rgba(239,68,68,0.4)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const osSeries = subChart.addLineSeries({
          color: 'rgba(34,197,94,0.4)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        obSeries.setData(times.map((t: any) => ({ time: t, value: overbought })));
        osSeries.setData(times.map((t: any) => ({ time: t, value: oversold })));

        subChart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.05 } });
      }

      if (strategyType === 'macd') {
        const fast = Number(config.fastPeriod) || 12;
        const slow = Number(config.slowPeriod) || 26;
        const signal = Number(config.signalPeriod) || 9;
        const macdValues = calcMACD(closes, fast, slow, signal);

        const macdSeries = subChart.addLineSeries({
          color: '#3b82f6',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const signalSeries = subChart.addLineSeries({
          color: '#f97316',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const histogramSeries = subChart.addHistogramSeries({
          priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
          priceLineVisible: false,
          lastValueVisible: false,
        });

        const macdData = macdValues.map((v, i) => ({
          time: times[i],
          value: v.macd ?? 0,
        }));
        const signalData = macdValues.map((v, i) => ({
          time: times[i],
          value: v.signal ?? 0,
        }));
        const histData = macdValues.map((v, i) => ({
          time: times[i],
          value: v.histogram ?? 0,
          color: (v.histogram ?? 0) >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)',
        }));

        macdSeries.setData(macdData);
        signalSeries.setData(signalData);
        histogramSeries.setData(histData);
      }

      // Sync sub-chart to main chart's visible range (not fitContent — keeps identical alignment)
      const mainRange = chart.timeScale().getVisibleLogicalRange();
      if (mainRange) {
        subChart.timeScale().setVisibleLogicalRange(mainRange);
      } else {
        subChart.timeScale().fitContent();
      }
      indicatorInstance.current = subChart;

      // Sync time scales on scroll/zoom
      let syncing = false;
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (syncing || !range) return;
        syncing = true;
        subChart.timeScale().setVisibleLogicalRange(range);
        syncing = false;
      });
      subChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (syncing || !range) return;
        syncing = true;
        chart.timeScale().setVisibleLogicalRange(range);
        syncing = false;
      });
    }

    const handleResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
      if (indicatorRef.current && indicatorInstance.current) {
        indicatorInstance.current.applyOptions({ width: indicatorRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstance.current = null;
      if (indicatorInstance.current) {
        indicatorInstance.current.remove();
        indicatorInstance.current = null;
      }
    };
  }, [candles, strategyType, config, signals]);

  // Real-time ticker update on last candle
  useEffect(() => {
    if (!candleSeriesRef.current || !ticker || !candles || candles.length === 0) return;
    const lastCandle = candles[candles.length - 1];
    const price = Number(ticker.price);
    candleSeriesRef.current.update({
      time: (lastCandle.timestamp / 1000) as any,
      open: Number(lastCandle.open),
      high: Math.max(Number(lastCandle.high), price),
      low: Math.min(Number(lastCandle.low), price),
      close: price,
    });
  }, [ticker, candles]);

  const needsSubChart = strategyType === 'rsi' || strategyType === 'macd';
  const indicatorLabel =
    strategyType === 'rsi'
      ? `RSI (${config.period || 14})`
      : strategyType === 'macd'
        ? `MACD (${config.fastPeriod || 12}, ${config.slowPeriod || 26}, ${config.signalPeriod || 9})`
        : strategyType === 'bollinger'
          ? `Bollinger (${config.period || 20}, ${config.stdDev || 2})`
          : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              type="button"
              onClick={() => setSelectedInterval(iv)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                selectedInterval === iv
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-medium">{indicatorLabel}</span>
      </div>
      {isLoading ? (
        <div
          style={{ height: needsSubChart ? 450 : 400 }}
          className="flex items-center justify-center text-muted-foreground text-sm"
        >
          Loading chart...
        </div>
      ) : (
        <>
          <div ref={chartRef} />
          {needsSubChart && (
            <div ref={indicatorRef} style={{ borderTop: '1px solid rgba(243,244,246,0.2)' }} />
          )}
        </>
      )}
    </div>
  );
}
