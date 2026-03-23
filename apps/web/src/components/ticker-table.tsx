'use client';

import { Ticker } from '@coin/types';

interface TickerTableProps {
  tickers: Ticker[];
}

function formatPrice(price: string): string {
  const num = Number(price);
  if (num >= 1000) return num.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  if (num >= 1) return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  return num.toLocaleString('ko-KR', { maximumFractionDigits: 8 });
}

function formatVolume(volume: string): string {
  const num = Number(volume);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

export function TickerTable({ tickers }: TickerTableProps) {
  const sorted = [...tickers].sort((a, b) => {
    if (a.symbol < b.symbol) return -1;
    if (a.symbol > b.symbol) return 1;
    return a.exchange.localeCompare(b.exchange);
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '14px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
            <th style={{ padding: '8px' }}>Exchange</th>
            <th style={{ padding: '8px' }}>Symbol</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>24h Change</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>24h High</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>24h Low</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Volume</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                Waiting for ticker data...
              </td>
            </tr>
          ) : (
            sorted.map((t) => {
              const changeNum = Number(t.changePercent24h);
              const changeColor = changeNum > 0 ? '#22c55e' : changeNum < 0 ? '#ef4444' : '#888';
              return (
                <tr key={`${t.exchange}:${t.symbol}`} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                    {t.exchange}
                  </td>
                  <td style={{ padding: '8px' }}>{t.symbol}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                    {formatPrice(t.price)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: changeColor }}>
                    {changeNum > 0 ? '+' : ''}{Number(t.changePercent24h).toFixed(2)}%
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatPrice(t.high24h)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatPrice(t.low24h)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatVolume(t.volume24h)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
