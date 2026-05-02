'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import type { Ticker } from '@coin/types';
import { CoinIcon, ExchangeIcon } from '@/components/icons';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { useBaseCurrency } from '@/hooks/use-base-currency';
import { formatPrice } from '@/lib/utils';

interface TickerCardListProps {
  tickers: Ticker[];
}

function getDisplayPrices(
  price: string,
  krwPerUsd: number,
  baseCurrency: 'KRW' | 'USD',
): { main: string; sub: string | null } {
  const num = Number(price);
  if (!krwPerUsd) return { main: `$${formatPrice(price)}`, sub: null };

  if (baseCurrency === 'KRW') {
    const krw = num * krwPerUsd;
    return {
      main: `₩${krw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`,
      sub: `$${formatPrice(price)}`,
    };
  }
  return { main: `$${formatPrice(price)}`, sub: null };
}

function TickerCard({ ticker }: { ticker: Ticker }) {
  const { krwPerUsd } = useExchangeRate();
  const { currency: baseCurrency } = useBaseCurrency();

  const changeNum = Number(ticker.changePercent24h);
  const changeColor =
    changeNum > 0 ? 'text-green-500' : changeNum < 0 ? 'text-red-500' : 'text-muted-foreground';

  const { main: mainPrice, sub: subPrice } = getDisplayPrices(
    ticker.price,
    krwPerUsd,
    baseCurrency,
  );

  return (
    <Link
      href={`/markets/${ticker.exchange}/${encodeURIComponent(ticker.symbol)}`}
      className="block rounded-xl border border-border bg-card p-3.5 active:bg-muted/50"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CoinIcon symbol={ticker.symbol} size={28} />
          <div>
            <div className="font-semibold text-sm">{ticker.symbol}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExchangeIcon exchange={ticker.exchange} size={12} />
              <span className="capitalize">{ticker.exchange}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-sm tabular-nums">{mainPrice}</div>
          {subPrice && <div className="text-xs text-muted-foreground tabular-nums">{subPrice}</div>}
        </div>
      </div>

      <div className="flex justify-between text-xs">
        <span className={`font-medium ${changeColor}`}>
          {changeNum > 0 ? '+' : ''}
          {changeNum.toFixed(2)}%
        </span>
        <span className="text-muted-foreground">
          H {formatPrice(ticker.high24h)} · L {formatPrice(ticker.low24h)}
        </span>
      </div>
    </Link>
  );
}

export function TickerCardList({ tickers }: TickerCardListProps) {
  const t = useTranslations('ticker');
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter) return tickers;
    const q = filter.toLowerCase();
    return tickers.filter(
      (tk) => tk.symbol.toLowerCase().includes(q) || tk.exchange.toLowerCase().includes(q),
    );
  }, [tickers, filter]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('search') || 'Search symbol...'}
          className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">
          {filter ? `"${filter}" — no results` : t('waiting')}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticker) => (
            <TickerCard key={`${ticker.exchange}:${ticker.symbol}`} ticker={ticker} />
          ))}
        </div>
      )}
    </div>
  );
}
