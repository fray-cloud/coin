'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, LayoutGrid, LayoutList } from 'lucide-react';
import { formatKrw, cn } from '@/lib/utils';
import { PnlValue } from '@/components/shared/pnl-value';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { PortfolioAsset } from '@/lib/api-client';

type AssetSortKey = 'exchange' | 'currency' | 'quantity' | 'valueKrw' | 'pnl';
type SortDir = 'asc' | 'desc';
type ViewMode = 'card' | 'table';

function SortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: AssetSortKey;
  sortKey: AssetSortKey | null;
  sortDir: SortDir;
}) {
  if (sortKey !== column) return <ArrowUpDown size={14} className="inline ml-1 opacity-40" />;
  return sortDir === 'asc' ? (
    <ArrowUp size={14} className="inline ml-1" />
  ) : (
    <ArrowDown size={14} className="inline ml-1" />
  );
}

function pnlPercent(asset: PortfolioAsset): number | null {
  const qty = parseFloat(asset.quantity);
  if (asset.avgCost > 0 && qty > 0) {
    const costBasis = asset.avgCost * qty;
    return (asset.pnl / costBasis) * 100;
  }
  return null;
}

function AssetCard({ asset }: { asset: PortfolioAsset }) {
  const t = useTranslations('portfolio');
  const pct = pnlPercent(asset);
  const pnlColor =
    asset.pnl > 0
      ? 'text-green-600 dark:text-green-400'
      : asset.pnl < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header: coin + exchange */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CoinIcon symbol={asset.currency} size={24} />
          <span className="text-base font-bold">{asset.currency}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExchangeIcon exchange={asset.exchange} size={14} />
          <span className="capitalize">{asset.exchange}</span>
        </div>
      </div>

      {/* Current price */}
      <div>
        <p className="text-xs text-muted-foreground">{t('current')}</p>
        <p className="text-lg font-semibold tabular-nums">
          {asset.currentPrice > 0 ? formatKrw(asset.currentPrice) : '-'}
        </p>
      </div>

      {/* Holdings + valuation row */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{t('holdings')}</p>
          <p className="tabular-nums font-medium">{asset.quantity}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('value')}</p>
          <p className="tabular-nums font-medium">{formatKrw(asset.valueKrw)}</p>
        </div>
      </div>

      {/* P&L row */}
      <div className="flex items-center justify-between pt-1 border-t">
        <span className="text-xs text-muted-foreground">{t('pnl')}</span>
        <div className="text-right">
          <div className={`font-bold text-sm ${pnlColor}`}>
            {asset.pnl > 0 ? '+' : ''}
            {formatKrw(asset.pnl)}
          </div>
          {pct !== null && (
            <div className={`text-xs font-semibold ${pnlColor}`}>
              {pct > 0 ? '+' : ''}
              {pct.toFixed(2)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AssetTableProps {
  assets: PortfolioAsset[];
}

export function AssetTable({ assets }: AssetTableProps) {
  const t = useTranslations('portfolio');
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<AssetSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const toggleSort = (key: AssetSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const processed = useMemo(() => {
    let result = assets;
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter((a) => a.currency.toLowerCase().includes(q));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [assets, searchText, sortKey, sortDir]);

  const thClass = 'pb-2 font-medium cursor-pointer select-none';

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder={t('currency') + '...'}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="h-8 pl-7 pr-2 text-sm rounded-md border border-input bg-background"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('card')}
            title={t('cardView')}
          >
            <LayoutGrid size={15} />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            title={t('tableView')}
          >
            <LayoutList size={15} />
          </Button>
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {processed.map((a, i) => (
            <AssetCard key={`${a.exchange}-${a.currency}-${i}`} asset={a} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className={thClass} onClick={() => toggleSort('exchange')}>
                  {t('exchange')}
                  <SortIcon column="exchange" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={thClass} onClick={() => toggleSort('currency')}>
                  {t('currency')}
                  <SortIcon column="currency" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={cn(thClass, 'text-right')} onClick={() => toggleSort('quantity')}>
                  {t('quantity')}
                  <SortIcon column="quantity" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className="pb-2 font-medium text-right">{t('avgCost')}</th>
                <th className="pb-2 font-medium text-right">{t('current')}</th>
                <th className={cn(thClass, 'text-right')} onClick={() => toggleSort('valueKrw')}>
                  {t('value')}
                  <SortIcon column="valueKrw" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={cn(thClass, 'text-right')} onClick={() => toggleSort('pnl')}>
                  {t('pnl')}
                  <SortIcon column="pnl" sortKey={sortKey} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {processed.map((a, i) => (
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
      )}
    </div>
  );
}
