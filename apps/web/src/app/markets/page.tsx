'use client';

import { useTickers } from '@/hooks/use-tickers';
import { TickerTable } from '@/components/ticker-table';

export default function MarketsPage() {
  const { tickers, connected } = useTickers();

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Markets</h1>
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
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <TickerTable tickers={tickers} />
    </main>
  );
}
