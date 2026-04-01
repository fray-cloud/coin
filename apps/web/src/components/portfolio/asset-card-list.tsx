'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { formatKrw } from '@/lib/utils';
import { PnlValue } from '@/components/shared/pnl-value';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import type { PortfolioAsset } from '@/lib/api-client';

interface AssetCardListProps {
  assets: PortfolioAsset[];
}

function AssetCard({ asset }: { asset: PortfolioAsset }) {
  const t = useTranslations('portfolio');

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CoinIcon symbol={asset.currency} size={28} />
          <div>
            <div className="font-semibold text-sm">{asset.currency}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExchangeIcon exchange={asset.exchange} size={12} />
              <span className="capitalize">{asset.exchange}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-sm tabular-nums">{formatKrw(asset.valueKrw)}</div>
          <div className="text-xs text-muted-foreground">{t('value')}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-muted/40 rounded-lg p-2">
          <div className="text-muted-foreground mb-0.5">{t('quantity')}</div>
          <div className="font-medium tabular-nums">{asset.quantity}</div>
        </div>
        <div className="bg-muted/40 rounded-lg p-2">
          <div className="text-muted-foreground mb-0.5">{t('avgCost')}</div>
          <div className="font-medium tabular-nums">
            {asset.avgCost > 0 ? formatKrw(asset.avgCost) : '-'}
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg p-2">
          <div className="text-muted-foreground mb-0.5">{t('current')}</div>
          <div className="font-medium tabular-nums">
            {asset.currentPrice > 0 ? formatKrw(asset.currentPrice) : '-'}
          </div>
        </div>
      </div>

      {/* P&L row */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t('pnl')}</span>
        <PnlValue value={asset.pnl} />
      </div>
    </div>
  );
}

export function AssetCardList({ assets }: AssetCardListProps) {
  const t = useTranslations('portfolio');
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    if (!searchText) return assets;
    const q = searchText.toLowerCase();
    return assets.filter((a) => a.currency.toLowerCase().includes(q));
  }, [assets, searchText]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder={`${t('currency')}...`}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full h-9 pl-7 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">{t('noAssets')}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((asset, i) => (
            <AssetCard key={`${asset.exchange}-${asset.currency}-${i}`} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
