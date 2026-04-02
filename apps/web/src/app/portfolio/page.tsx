'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPortfolioSummary } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { formatKrw } from '@/lib/utils';
import { PnlValue } from '@/components/shared/pnl-value';
import { PnlChart } from '@/components/shared/pnl-chart';
import { AssetTable } from '@/components/portfolio/asset-table';
import { AssetCardList } from '@/components/portfolio/asset-card-list';
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/skeleton';

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
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <Card>
          <CardContent className="pt-6">
            <SkeletonChart height={250} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <SkeletonTable rows={5} cols={7} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <p className="text-muted-foreground">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
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

      {/* Assets — card view on mobile, table on desktop */}
      <div className="md:hidden space-y-2">
        <h2 className="text-base font-semibold">{t('assets')}</h2>
        {data.assets.length > 0 ? (
          <AssetCardList assets={data.assets} />
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('noAssets')}</p>
        )}
      </div>
      <Card className="hidden md:block">
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
