'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ExchangeIcon } from '@/components/icons';
import { useBalances } from '@/hooks/use-balances';
import type { ExchangeKeyItem } from '@/lib/api-client';

export function BalanceTable({ keyItem }: { keyItem: ExchangeKeyItem }) {
  const t = useTranslations('accounts');
  const [showAll, setShowAll] = useState(false);

  const { data: balances, isLoading, error, refetch } = useBalances(keyItem.id);

  const filtered = balances?.filter(
    (b) => showAll || parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
            <ExchangeIcon exchange={keyItem.exchange} size={14} />
            {keyItem.exchange.charAt(0).toUpperCase() + keyItem.exchange.slice(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(keyItem.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded"
            />
            {t('showAll')}
          </label>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            {t('refresh')}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load balances'}
        </p>
      )}

      {filtered && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">{t('currency')}</th>
                <th className="pb-2 font-medium text-right">{t('available')}</th>
                <th className="pb-2 font-medium text-right">{t('locked')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.currency} className="border-b last:border-0">
                  <td className="py-1.5 font-medium">{b.currency}</td>
                  <td className="py-1.5 text-right tabular-nums">{b.free}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {b.locked}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered && filtered.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">{t('noBalances')}</p>
      )}
    </div>
  );
}
