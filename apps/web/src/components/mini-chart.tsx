'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi } from 'lightweight-charts';
import { useCandles } from '@/hooks/use-candles';

interface MiniChartProps {
  exchange: string;
  symbol: string;
  width?: number;
  height?: number;
}

export function MiniChart({ exchange, symbol, width = 100, height = 40 }: MiniChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const { data: candles } = useCandles(exchange, symbol, '1h');

  useEffect(() => {
    if (!chartRef.current || !candles || candles.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.remove();
      chartInstance.current = null;
    }

    const chart = createChart(chartRef.current, {
      width,
      height,
      layout: {
        attributionLogo: false,
        background: { type: ColorType.Solid, color: 'transparent' },
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { horzLine: { visible: false }, vertLine: { visible: false } },
      handleScroll: false,
      handleScale: false,
    });

    const first = Number(candles[0].close);
    const last = Number(candles[candles.length - 1].close);
    const isUp = last >= first;

    const series = chart.addLineSeries({
      color: isUp ? '#22c55e' : '#ef4444',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    series.setData(
      candles.map((c) => ({
        time: (c.timestamp / 1000) as any,
        value: Number(c.close),
      })),
    );

    chart.timeScale().fitContent();
    chartInstance.current = chart;

    return () => {
      chart.remove();
      chartInstance.current = null;
    };
  }, [candles, width, height]);

  return <div ref={chartRef} style={{ width, height, display: 'inline-block' }} />;
}
