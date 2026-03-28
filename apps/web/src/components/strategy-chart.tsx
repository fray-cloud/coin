'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useCandles } from '@/hooks/use-candles';
import { useTickersStore } from '@/stores/use-tickers-store';
import { calcRSI, calcMACD, calcBollinger } from '@/lib/indicators';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

interface StrategyChartProps {
  exchange: string;
  symbol: string;
  strategyType: string;
  config: Record<string, unknown>;
  candleInterval?: string;
}

export function StrategyChart({
  exchange,
  symbol,
  strategyType,
  config,
  candleInterval,
}: StrategyChartProps) {
  const [selectedInterval, setSelectedInterval] = useState(candleInterval || '1h');
  const chartRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const indicatorInstance = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { data: candles, isLoading } = useCandles(exchange, symbol, selectedInterval);

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
      timeScale: { borderVisible: false, timeVisible: true, shiftVisibleRangeOnNewBar: true },
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
        timeScale: { visible: false },
      });

      // Add invisible anchor series with same timestamps as candle chart to align time axes
      const anchorSeries = subChart.addLineSeries({
        visible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      anchorSeries.setData(candles.map((c) => ({ time: (c.timestamp / 1000) as any, value: 0 })));

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
        const rsiData = rsiValues
          .map((v, i) => (v !== null ? { time: times[i], value: v } : null))
          .filter(Boolean) as any[];
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

        const macdData = macdValues
          .map((v, i) => (v.macd !== null ? { time: times[i], value: v.macd } : null))
          .filter(Boolean) as any[];
        const signalData = macdValues
          .map((v, i) => (v.signal !== null ? { time: times[i], value: v.signal } : null))
          .filter(Boolean) as any[];
        const histData = macdValues
          .map((v, i) => {
            if (v.histogram === null) return null;
            return {
              time: times[i],
              value: v.histogram,
              color: v.histogram >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)',
            };
          })
          .filter(Boolean) as any[];

        macdSeries.setData(macdData);
        signalSeries.setData(signalData);
        histogramSeries.setData(histData);
      }

      subChart.timeScale().fitContent();
      indicatorInstance.current = subChart;

      // Sync time scales
      let syncing = false;
      chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        if (syncing) return;
        syncing = true;
        const logicalRange = chart.timeScale().getVisibleLogicalRange();
        if (logicalRange) subChart.timeScale().setVisibleLogicalRange(logicalRange);
        syncing = false;
      });
      subChart.timeScale().subscribeVisibleTimeRangeChange(() => {
        if (syncing) return;
        syncing = true;
        const logicalRange = subChart.timeScale().getVisibleLogicalRange();
        if (logicalRange) chart.timeScale().setVisibleLogicalRange(logicalRange);
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
  }, [candles, strategyType, config]);

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
