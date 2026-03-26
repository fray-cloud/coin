'use client';

import { useTranslations } from 'next-intl';
import { useTickers } from '@/hooks/use-tickers';
import { TickerTable } from '@/components/ticker-table';
import { ExchangeRateBadge } from '@/components/exchange-rate-badge';

export default function MarketsPage() {
  const { tickers, connected } = useTickers();
  const t = useTranslations('markets');

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>{t('title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ExchangeRateBadge />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: connected ? '#22c55e' : '#ef4444',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: connected ? '#22c55e' : '#ef4444',
              }}
            />
            {connected ? t('connected') : t('disconnected')}
          </span>
        </div>
      </div>

      <TickerTable tickers={tickers} />
    </main>
  );
}
