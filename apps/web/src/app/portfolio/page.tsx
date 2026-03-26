'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPortfolioSummary, type PortfolioAsset } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { createChart, ColorType, type IChartApi } from 'lightweight-charts';
import { CoinIcon, ExchangeIcon } from '@/components/icons';

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
        attributionLogo: false,
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
  const t = useTranslations('portfolio');
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">{t('exchange')}</th>
            <th className="pb-2 font-medium">{t('currency')}</th>
            <th className="pb-2 font-medium text-right">{t('quantity')}</th>
            <th className="pb-2 font-medium text-right">{t('avgCost')}</th>
            <th className="pb-2 font-medium text-right">{t('current')}</th>
            <th className="pb-2 font-medium text-right">{t('value')}</th>
            <th className="pb-2 font-medium text-right">{t('pnl')}</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a, i) => (
            <tr key={`${a.exchange}-${a.currency}-${i}`} className="border-b last:border-0">
              <td className="py-2">
                <span className="flex items-center gap-1.5">
                  <ExchangeIcon exchange={a.exchange} size={16} />
                  <span className="capitalize">{a.exchange}</span>
                </span>
              </td>
              <td className="py-2 font-medium">
                <span className="flex items-center gap-1.5">
                  <CoinIcon symbol={a.currency} size={16} />
                  {a.currency}
                </span>
              </td>
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

const MODES = ['all', 'real', 'paper'] as const;
type Mode = (typeof MODES)[number];

export default function PortfolioPage() {
  const t = useTranslations('portfolio');
  const [mode, setMode] = useState<Mode>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio', mode],
    queryFn: () => getPortfolioSummary(mode),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <p className="text-muted-foreground">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          {MODES.map((m) => (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode(m)}
              className={
                m === 'paper'
                  ? mode === m
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : ''
                  : m === 'real'
                    ? mode === m
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : ''
                    : ''
              }
            >
              {t(m as 'all' | 'real' | 'paper')}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('totalValue')}</p>
            <p className="text-2xl font-bold">{formatKrw(data.totalValueKrw)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('realizedPnl')}</p>
            <p className="text-2xl">
              <PnlValue value={data.realizedPnl} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('unrealizedPnl')}</p>
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
            <CardTitle className="text-lg">{t('cumulativePnl')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PnlChart data={data.dailyPnl} />
          </CardContent>
        </Card>
      )}

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('assets')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.assets.length > 0 ? (
            <AssetTable assets={data.assets} />
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('noAssets')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
