'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getPortfolioSummary, type PortfolioAsset } from '@/lib/api-client';
import { createChart, ColorType, type IChartApi } from 'lightweight-charts';

function formatKrw(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
}

function PnlValue({ value, prefix = '' }: { value: number; prefix?: string }) {
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-muted-foreground';
  const sign = value > 0 ? '+' : '';
  return (
    <span className={`font-bold ${color}`}>
      {prefix}
      {sign}
      {formatKrw(value)}
    </span>
  );
}

function PnlChart({ data }: { data: Array<{ date: string; pnl: number }> }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 250,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    const series = chart.addAreaSeries({
      lineColor: '#3b82f6',
      topColor: 'rgba(59,130,246,0.3)',
      bottomColor: 'rgba(59,130,246,0.05)',
      lineWidth: 2,
    });

    series.setData(
      data.map((d) => ({
        time: d.date,
        value: d.pnl,
      })),
    );

    chart.timeScale().fitContent();
    chartInstance.current = chart;

    const handleResize = () => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return <div ref={chartRef} />;
}

function AssetTable({ assets }: { assets: PortfolioAsset[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Exchange</th>
            <th className="pb-2 font-medium">Currency</th>
            <th className="pb-2 font-medium text-right">Quantity</th>
            <th className="pb-2 font-medium text-right">Avg Cost</th>
            <th className="pb-2 font-medium text-right">Current</th>
            <th className="pb-2 font-medium text-right">Value</th>
            <th className="pb-2 font-medium text-right">P&L</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a, i) => (
            <tr key={`${a.exchange}-${a.currency}-${i}`} className="border-b last:border-0">
              <td className="py-2 capitalize">{a.exchange}</td>
              <td className="py-2 font-medium">{a.currency}</td>
              <td className="py-2 text-right tabular-nums">{a.quantity}</td>
              <td className="py-2 text-right tabular-nums">
                {a.avgCost > 0 ? formatKrw(a.avgCost) : '-'}
              </td>
              <td className="py-2 text-right tabular-nums">
                {a.currentPrice > 0 ? formatKrw(a.currentPrice) : '-'}
              </td>
              <td className="py-2 text-right tabular-nums">{formatKrw(a.valueKrw)}</td>
              <td className="py-2 text-right">
                <PnlValue value={a.pnl} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PortfolioPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolioSummary,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <p className="text-muted-foreground">Loading portfolio...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <p className="text-muted-foreground">
          No portfolio data. Register exchange keys in Accounts first.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Portfolio</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">{formatKrw(data.totalValueKrw)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Realized P&L</p>
            <p className="text-2xl">
              <PnlValue value={data.realizedPnl} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Unrealized P&L</p>
            <p className="text-2xl">
              <PnlValue value={data.unrealizedPnl} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Chart */}
      {data.dailyPnl.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cumulative P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <PnlChart data={data.dailyPnl} />
          </CardContent>
        </Card>
      )}

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assets</CardTitle>
        </CardHeader>
        <CardContent>
          {data.assets.length > 0 ? (
            <AssetTable assets={data.assets} />
          ) : (
            <p className="text-center text-muted-foreground py-8">No assets found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
