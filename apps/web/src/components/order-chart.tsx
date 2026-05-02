'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
} from 'lightweight-charts';
import { useCandles } from '@/hooks/use-candles';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

interface OrderChartProps {
  exchange: string;
  symbol: string;
  entryPrice: number | null;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  height?: number;
}

export function OrderChart({
  exchange,
  symbol,
  entryPrice,
  takeProfitPrice,
  stopLossPrice,
  height = 400,
}: OrderChartProps) {
  const [interval, setInterval] = useState('15m');
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const linesRef = useRef<IPriceLine[]>([]);

  const { data: candles, isLoading } = useCandles(exchange, symbol, interval);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
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

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      linesRef.current = [];
    };
  }, [height]);

  useEffect(() => {
    if (!seriesRef.current || !candles) return;
    seriesRef.current.setData(
      candles.map((c) => ({
        time: Math.floor(c.timestamp / 1000) as never,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      })),
    );
  }, [candles]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    for (const line of linesRef.current) series.removePriceLine(line);
    linesRef.current = [];

    const add = (price: number | null, color: string, label: string) => {
      if (price == null || !Number.isFinite(price)) return;
      const line = series.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: label,
      });
      linesRef.current.push(line);
    };

    add(entryPrice, '#3b82f6', 'Entry');
    add(takeProfitPrice, '#22c55e', 'TP');
    add(stopLossPrice, '#ef4444', 'SL');
  }, [entryPrice, takeProfitPrice, stopLossPrice, candles]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap items-center">
        {INTERVALS.map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => setInterval(iv)}
            className={`px-2.5 py-1 text-xs rounded-md ${
              interval === iv
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {iv}
          </button>
        ))}
      </div>
      <div ref={containerRef} style={{ width: '100%', height }} data-testid="order-chart" />
      {isLoading && <p className="text-center text-xs text-muted-foreground">Loading candles...</p>}
    </div>
  );
}
