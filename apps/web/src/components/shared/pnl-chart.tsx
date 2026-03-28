'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi } from 'lightweight-charts';

interface PnlChartProps {
  data: Array<{ date: string; pnl: number }>;
  height?: number;
}

export function PnlChart({ data, height = 250 }: PnlChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (chartInstance.current) {
      try {
        chartInstance.current.remove();
      } catch {}
      chartInstance.current = null;
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
      timeScale: { borderVisible: false },
    });

    const lastPnl = data[data.length - 1].pnl;
    const series = chart.addAreaSeries({
      lineColor: lastPnl >= 0 ? '#22c55e' : '#ef4444',
      topColor: lastPnl >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
      bottomColor: lastPnl >= 0 ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
      lineWidth: 2,
    });

    series.setData(data.map((d) => ({ time: d.date as any, value: d.pnl })));
    chart.timeScale().fitContent();
    chartInstance.current = chart;

    const handleResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        chart.remove();
      } catch {}
      chartInstance.current = null;
    };
  }, [data, height]);

  return <div ref={chartRef} />;
}
