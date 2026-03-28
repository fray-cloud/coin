'use client';

import { useTranslations } from 'next-intl';
import { formatKrw } from '@/lib/utils';
import { PnlValue } from '@/components/shared/pnl-value';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import type { PortfolioAsset } from '@/lib/api-client';

interface AssetTableProps {
  assets: PortfolioAsset[];
}

export function AssetTable({ assets }: AssetTableProps) {
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
