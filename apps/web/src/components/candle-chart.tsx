'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useCandles } from '@/hooks/use-candles';

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
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const { data: candles, isLoading } = useCandles(exchange, symbol, selectedInterval);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height,
      layout: {
        attributionLogo: false,
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(156, 163, 175, 0.1)' },
        horzLines: { color: 'rgba(156, 163, 175, 0.1)' },
      },
      timeScale: { timeVisible: true, secondsVisible: false },
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
      color: '#94a3b8',
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartInstance.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartRef.current && chartInstance.current) {
        chartInstance.current.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstance.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !candles) return;

    const candleData = candles.map((c) => ({
      time: Math.floor(c.timestamp / 1000) as never,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }));
    const volumeData = candles.map((c) => ({
      time: Math.floor(c.timestamp / 1000) as never,
      value: Number(c.volume),
      color: Number(c.close) >= Number(c.open) ? '#22c55e80' : '#ef444480',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
  }, [candles]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap items-center">
        {INTERVALS.map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => setSelectedInterval(iv)}
            className={`px-2.5 py-1 text-xs rounded-md ${
              selectedInterval === iv
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {iv}
          </button>
        ))}
      </div>
      <div ref={chartRef} style={{ width: '100%', height }} />
      {isLoading && <p className="text-center text-xs text-muted-foreground">Loading candles...</p>}
    </div>
  );
}
