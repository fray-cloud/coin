'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Ticker } from '@coin/types';
import { CoinIcon, ExchangeIcon } from '@/components/icons';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { MiniChart } from '@/components/mini-chart';
import { formatPrice, formatVolume } from '@/lib/utils';

interface TickerTableProps {
  tickers: Ticker[];
}

function convertedPrice(price: string, exchange: string, krwPerUsd: number): string | null {
  if (!krwPerUsd) return null;
  const num = Number(price);
  if (exchange === 'upbit') {
    const usd = num / krwPerUsd;
    return `$${usd >= 1 ? usd.toLocaleString('en-US', { maximumFractionDigits: 2 }) : usd.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
  }
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
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-border text-left">
            <th className="p-2">{t('exchange')}</th>
            <th className="p-2">{t('symbol')}</th>
            <th className="p-2 text-right">{t('price')}</th>
            <th className="p-2 text-right">{t('change24h')}</th>
            <th className="p-2 text-right">{t('high24h')}</th>
            <th className="p-2 text-right">{t('low24h')}</th>
            <th className="p-2 text-right">{t('volume')}</th>
            <th className="p-2 text-center w-28">Chart</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-6 text-center text-muted-foreground">
                {t('waiting')}
              </td>
            </tr>
          ) : (
            sorted.map((tick) => {
              const changeNum = Number(tick.changePercent24h);
              const changeColor =
                changeNum > 0
                  ? 'text-green-500'
                  : changeNum < 0
                    ? 'text-red-500'
                    : 'text-muted-foreground';
              const converted = convertedPrice(tick.price, tick.exchange, krwPerUsd);
              return (
                <tr
                  key={`${tick.exchange}:${tick.symbol}`}
                  className="border-b border-border cursor-pointer hover:bg-muted/50"
                >
                  <td className="p-2 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <ExchangeIcon exchange={tick.exchange} size={18} />
                      {tick.exchange.charAt(0).toUpperCase() + tick.exchange.slice(1)}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className="inline-flex items-center gap-1.5">
                      <CoinIcon symbol={tick.symbol} size={18} />
                      {tick.symbol}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <div className="font-bold">{formatPrice(tick.price)}</div>
                    {converted && <div className="text-xs text-muted-foreground">{converted}</div>}
                  </td>
                  <td className={`p-2 text-right ${changeColor}`}>
                    {changeNum > 0 ? '+' : ''}
                    {Number(tick.changePercent24h).toFixed(2)}%
                  </td>
                  <td className="p-2 text-right">{formatPrice(tick.high24h)}</td>
                  <td className="p-2 text-right">{formatPrice(tick.low24h)}</td>
                  <td className="p-2 text-right">{formatVolume(tick.volume24h)}</td>
                  <td className="p-2 text-center">
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
