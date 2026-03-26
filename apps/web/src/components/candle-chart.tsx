'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useCandles } from '@/hooks/use-candles';
import { useTickersStore } from '@/stores/use-tickers-store';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

interface CandleChartProps {
  exchange: string;
  symbol: string;
  height?: number;
}

export function CandleChart({ exchange, symbol, height = 400 }: CandleChartProps) {
  const [selectedInterval, setSelectedInterval] = useState('1h');
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { data: candles, isLoading } = useCandles(exchange, symbol, selectedInterval);

  // Real-time ticker price
  const tickerKey = `${exchange}:${symbol}`;
  const ticker = useTickersStore((s) => s.tickers.get(tickerKey));

  useEffect(() => {
    if (!chartRef.current || !candles || candles.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.remove();
      chartInstance.current = null;
      candleSeriesRef.current = null;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height,
      layout: {
        attributionLogo: false,
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(243,244,246,0.1)' },
        horzLines: { color: 'rgba(243,244,246,0.1)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: {
        horzLine: { visible: true, labelVisible: true },
        vertLine: { visible: true, labelVisible: true },
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

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const candleData = candles.map((c) => ({
      time: (c.timestamp / 1000) as any,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }));

    const volumeData = candles.map((c) => ({
      time: (c.timestamp / 1000) as any,
      value: Number(c.volume),
      color: Number(c.close) >= Number(c.open) ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    chart.timeScale().fitContent();

    chartInstance.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstance.current = null;
      candleSeriesRef.current = null;
    };
  }, [candles, height]);

  // Update last candle with real-time ticker price
  useEffect(() => {
    if (!candleSeriesRef.current || !ticker || !candles || candles.length === 0) return;

    const lastCandle = candles[candles.length - 1];
    const price = Number(ticker.price);
    const lastTime = (lastCandle.timestamp / 1000) as any;

    candleSeriesRef.current.update({
      time: lastTime,
      open: Number(lastCandle.open),
      high: Math.max(Number(lastCandle.high), price),
      low: Math.min(Number(lastCandle.low), price),
      close: price,
    });
  }, [ticker, candles]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
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
        {ticker && (
          <span
            className={`text-sm font-bold tabular-nums ${Number(ticker.changePercent24h) >= 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {Number(ticker.price).toLocaleString()} (
            {Number(ticker.changePercent24h) > 0 ? '+' : ''}
            {Number(ticker.changePercent24h).toFixed(2)}%)
          </span>
        )}
      </div>
      {isLoading ? (
        <div
          style={{ height }}
          className="flex items-center justify-center text-muted-foreground text-sm"
        >
          Loading chart...
        </div>
      ) : (
        <div ref={chartRef} />
      )}
    </div>
  );
}
