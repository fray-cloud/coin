'use client';

import { useTranslations } from 'next-intl';
import { useTickers } from '@/hooks/use-tickers';
import { TickerTable } from '@/components/ticker-table';
import { ExchangeRateBadge } from '@/components/exchange-rate-badge';

export default function MarketsPage() {
  const { tickers, connected } = useTickers();
  const t = useTranslations('markets');

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-4">
          <ExchangeRateBadge />
          <span
            className={`inline-flex items-center gap-1.5 text-xs ${connected ? 'text-green-500' : 'text-red-500'}`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {connected ? t('connected') : t('disconnected')}
          </span>
        </div>
      </div>

      <TickerTable tickers={tickers} />
    </main>
  );
}
