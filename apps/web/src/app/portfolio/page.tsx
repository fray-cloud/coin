'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPortfolioSummary, type PortfolioNetwork } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { MoneyValue } from '@/components/shared/money-value';
import { PnlMoney } from '@/components/shared/pnl-money';
import { PnlChart } from '@/components/shared/pnl-chart';
import { AssetTable } from '@/components/portfolio/asset-table';
import { AssetCardList } from '@/components/portfolio/asset-card-list';
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/skeleton';

const NETWORKS: PortfolioNetwork[] = ['all', 'testnet', 'mainnet'];

const NETWORK_LABEL: Record<PortfolioNetwork, string> = {
  all: '전체',
  testnet: '모의 (Testnet)',
  mainnet: '실거래 (Mainnet)',
};

export default function PortfolioPage() {
  const t = useTranslations('portfolio');
  const [network, setNetwork] = useState<PortfolioNetwork>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio', network],
    queryFn: () => getPortfolioSummary(network),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
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

  const showSplit = network === 'all';

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          {NETWORKS.map((n) => (
            <Button
              key={n}
              variant={network === n ? 'default' : 'outline'}
              size="sm"
              onClick={() => setNetwork(n)}
              className={
                n === 'testnet' && network === n
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : n === 'mainnet' && network === n
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : ''
              }
            >
              {NETWORK_LABEL[n]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('totalValue')}</p>
            <p className="text-2xl font-bold">
              <MoneyValue usd={data.totalValueUsd} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('realizedPnl')}</p>
            <p className="text-2xl">
              <PnlMoney usd={data.realizedPnl} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('unrealizedPnl')}</p>
            <p className="text-2xl">
              <PnlMoney usd={data.unrealizedPnl} />
            </p>
          </CardContent>
        </Card>
      </div>

      {showSplit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-purple-500">모의 (Testnet)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('totalValue')}</span>
                <MoneyValue usd={data.byNetwork.testnet.totalValueUsd} showSub={false} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('realizedPnl')}</span>
                <PnlMoney usd={data.byNetwork.testnet.realizedPnl} showSub={false} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('unrealizedPnl')}</span>
                <PnlMoney usd={data.byNetwork.testnet.unrealizedPnl} showSub={false} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-orange-500">
                실거래 (Mainnet)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('totalValue')}</span>
                <MoneyValue usd={data.byNetwork.mainnet.totalValueUsd} showSub={false} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('realizedPnl')}</span>
                <PnlMoney usd={data.byNetwork.mainnet.realizedPnl} showSub={false} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('unrealizedPnl')}</span>
                <PnlMoney usd={data.byNetwork.mainnet.unrealizedPnl} showSub={false} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
