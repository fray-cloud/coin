'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Ticker } from '@coin/types';
import { CoinIcon, ExchangeIcon } from '@/components/icons';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { MiniChart } from '@/components/mini-chart';

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

function convertedPrice(price: string, exchange: string, krwPerUsd: number): string | null {
  if (!krwPerUsd) return null;
  const num = Number(price);
  if (exchange === 'upbit') {
    // KRW → USD
    const usd = num / krwPerUsd;
    return `$${usd >= 1 ? usd.toLocaleString('en-US', { maximumFractionDigits: 2 }) : usd.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
  }
  // USDT → KRW
  const krw = num * krwPerUsd;
  return `₩${krw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
}

export function TickerTable({ tickers }: TickerTableProps) {
  const t = useTranslations('ticker');
  const { krwPerUsd } = useExchangeRate();

  const sorted = [...tickers].sort((a, b) => {
    if (a.symbol < b.symbol) return -1;
    if (a.symbol > b.symbol) return 1;
    return a.exchange.localeCompare(b.exchange);
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
            <th style={{ padding: '8px' }}>{t('exchange')}</th>
            <th style={{ padding: '8px' }}>{t('symbol')}</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>{t('price')}</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>{t('change24h')}</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>{t('high24h')}</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>{t('low24h')}</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>{t('volume')}</th>
            <th style={{ padding: '8px', textAlign: 'center', width: '110px' }}>Chart</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                {t('waiting')}
              </td>
            </tr>
          ) : (
            sorted.map((tick) => {
              const changeNum = Number(tick.changePercent24h);
              const changeColor = changeNum > 0 ? '#22c55e' : changeNum < 0 ? '#ef4444' : '#888';
              const converted = convertedPrice(tick.price, tick.exchange, krwPerUsd);
              return (
                <tr
                  key={`${tick.exchange}:${tick.symbol}`}
                  style={{ borderBottom: '1px solid #222', cursor: 'pointer' }}
                >
                  <td style={{ padding: '8px', fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <ExchangeIcon exchange={tick.exchange} size={18} />
                      {tick.exchange.charAt(0).toUpperCase() + tick.exchange.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <CoinIcon symbol={tick.symbol} size={18} />
                      {tick.symbol}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{formatPrice(tick.price)}</div>
                    {converted && (
                      <div style={{ fontSize: '11px', color: '#888' }}>{converted}</div>
                    )}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: changeColor }}>
                    {changeNum > 0 ? '+' : ''}
                    {Number(tick.changePercent24h).toFixed(2)}%
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {formatPrice(tick.high24h)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatPrice(tick.low24h)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {formatVolume(tick.volume24h)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <Link href={`/markets/${tick.exchange}/${encodeURIComponent(tick.symbol)}`}>
                      <MiniChart
                        exchange={tick.exchange}
                        symbol={tick.symbol}
                        width={100}
                        height={36}
                      />
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
