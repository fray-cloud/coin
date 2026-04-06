'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTickers } from '@/hooks/use-tickers';
import { TickerTable } from '@/components/ticker-table';
import { TickerCardList } from '@/components/markets/ticker-card-list';
import { ExchangeRateBadge } from '@/components/exchange-rate-badge';
import { QuickOrderPanel } from '@/components/orders/quick-order-panel';
import type { Ticker } from '@coin/types';

export default function MarketsPage() {
  const { tickers, connected } = useTickers();
  const t = useTranslations('markets');
  const [selectedTicker, setSelectedTicker] = useState<Ticker | null>(null);

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

      {/* Mobile: card view (QuickOrderPanel handled internally via swipe) */}
      <div className="md:hidden">
        <TickerCardList tickers={tickers} />
      </div>

      {/* Desktop: table view */}
      <div className="hidden md:block">
        <TickerTable tickers={tickers} onRowClick={setSelectedTicker} />
        <QuickOrderPanel ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
      </div>
    </main>
  );
}
