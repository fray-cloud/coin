'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { Ticker } from '@coin/types';
import { CoinIcon, ExchangeIcon } from '@/components/icons';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { useBaseCurrency } from '@/hooks/use-base-currency';
import { MiniChart } from '@/components/mini-chart';
import { formatPrice, formatVolume } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TickerTableProps {
  tickers: Ticker[];
  onRowClick?: (ticker: Ticker) => void;
}

type SortKey = 'exchange' | 'symbol' | 'price' | 'change' | 'volume' | null;
type SortDir = 'asc' | 'desc';

function getDisplayPrices(
  price: string,
  exchange: string,
  krwPerUsd: number,
  baseCurrency: 'KRW' | 'USD',
): { main: string; sub: string | null } {
  const num = Number(price);
  if (!krwPerUsd) return { main: formatPrice(price), sub: null };

  const isKrwExchange = exchange === 'upbit';
  const isBaseKrw = baseCurrency === 'KRW';

  if (isKrwExchange && isBaseKrw) {
    const usd = num / krwPerUsd;
    return {
      main: `₩${formatPrice(price)}`,
      sub: `$${usd >= 1 ? usd.toLocaleString('en-US', { maximumFractionDigits: 2 }) : usd.toLocaleString('en-US', { maximumFractionDigits: 6 })}`,
    };
  }
  if (isKrwExchange && !isBaseKrw) {
    const usd = num / krwPerUsd;
    return {
      main: `$${usd >= 1 ? usd.toLocaleString('en-US', { maximumFractionDigits: 2 }) : usd.toLocaleString('en-US', { maximumFractionDigits: 6 })}`,
      sub: `₩${formatPrice(price)}`,
    };
  }
  if (!isKrwExchange && isBaseKrw) {
    const krw = num * krwPerUsd;
    return {
      main: `₩${krw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`,
      sub: `$${formatPrice(price)}`,
    };
  }
  return { main: `$${formatPrice(price)}`, sub: null };
}

const SORT_FNS: Record<string, (a: Ticker, b: Ticker) => number> = {
  exchange: (a, b) => a.exchange.localeCompare(b.exchange),
  symbol: (a, b) => a.symbol.localeCompare(b.symbol),
  price: (a, b) => Number(a.price) - Number(b.price),
  change: (a, b) => Number(a.changePercent24h) - Number(b.changePercent24h),
  volume: (a, b) => Number(a.volume24h) - Number(b.volume24h),
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={12} className="text-muted-foreground/40" />;
  return dir === 'asc' ? (
    <ArrowUp size={12} className="text-foreground" />
  ) : (
    <ArrowDown size={12} className="text-foreground" />
  );
}

interface TickerRowProps {
  tick: Ticker;
  krwPerUsd: number;
  baseCurrency: 'KRW' | 'USD';
  onRowClick?: (ticker: Ticker) => void;
}

function TickerRow({ tick, krwPerUsd, baseCurrency, onRowClick }: TickerRowProps) {
  const prevPrice = useRef(tick.price);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    if (tick.price !== prevPrice.current) {
      const dir = Number(tick.price) > Number(prevPrice.current) ? 'flash-up' : 'flash-down';
      prevPrice.current = tick.price;
      setFlashClass(dir);
      const timer = setTimeout(() => setFlashClass(''), 500);
      return () => clearTimeout(timer);
    }
  }, [tick.price]);

  const changeNum = Number(tick.changePercent24h);
  const changeColor =
    changeNum > 0 ? 'text-green-500' : changeNum < 0 ? 'text-red-500' : 'text-muted-foreground';
  const { main: mainPrice, sub: subPrice } = getDisplayPrices(
    tick.price,
    tick.exchange,
    krwPerUsd,
    baseCurrency,
  );

  return (
    <tr
      key={`${tick.exchange}:${tick.symbol}`}
      className={cn('border-b border-border cursor-pointer hover:bg-muted/50', flashClass)}
      onClick={() => onRowClick?.(tick)}
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
        <div className="font-bold">{mainPrice}</div>
        {subPrice && <div className="text-xs text-muted-foreground">{subPrice}</div>}
      </td>
      <td className={`p-2 text-right ${changeColor}`}>
        {changeNum > 0 ? '+' : ''}
        {Number(tick.changePercent24h).toFixed(2)}%
      </td>
      <td className="p-2 text-right">{formatPrice(tick.high24h)}</td>
      <td className="p-2 text-right">{formatPrice(tick.low24h)}</td>
      <td className="p-2 text-right">{formatVolume(tick.volume24h)}</td>
      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
        <Link href={`/markets/${tick.exchange}/${encodeURIComponent(tick.symbol)}`}>
          <MiniChart exchange={tick.exchange} symbol={tick.symbol} width={100} height={36} />
        </Link>
      </td>
    </tr>
  );
}

export function TickerTable({ tickers, onRowClick }: TickerTableProps) {
  const t = useTranslations('ticker');
  const { krwPerUsd } = useExchangeRate();
  const { currency: baseCurrency } = useBaseCurrency();
  const [sortKey, setSortKey] = useState<SortKey>('symbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState('');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const processed = useMemo(() => {
    let result = [...tickers];

    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(
        (t) => t.symbol.toLowerCase().includes(q) || t.exchange.toLowerCase().includes(q),
      );
    }

    if (sortKey && SORT_FNS[sortKey]) {
      const fn = SORT_FNS[sortKey];
      result.sort((a, b) => (sortDir === 'asc' ? fn(a, b) : -fn(a, b)));
    }

    return result;
  }, [tickers, sortKey, sortDir, filter]);

  const thClass = 'p-2 cursor-pointer select-none hover:text-foreground';

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
          className="w-full sm:w-64 h-9 pl-9 pr-3 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-border text-left">
              <th className={thClass} onClick={() => handleSort('exchange')}>
                <span className="inline-flex items-center gap-1">
                  {t('exchange')} <SortIcon active={sortKey === 'exchange'} dir={sortDir} />
                </span>
              </th>
              <th className={thClass} onClick={() => handleSort('symbol')}>
                <span className="inline-flex items-center gap-1">
                  {t('symbol')} <SortIcon active={sortKey === 'symbol'} dir={sortDir} />
                </span>
              </th>
              <th className={cn(thClass, 'text-right')} onClick={() => handleSort('price')}>
                <span className="inline-flex items-center gap-1 flex-row-reverse">
                  {t('price')} <SortIcon active={sortKey === 'price'} dir={sortDir} />
                </span>
              </th>
              <th className={cn(thClass, 'text-right')} onClick={() => handleSort('change')}>
                <span className="inline-flex items-center gap-1 flex-row-reverse">
                  {t('change24h')} <SortIcon active={sortKey === 'change'} dir={sortDir} />
                </span>
              </th>
              <th className="p-2 text-right">{t('high24h')}</th>
              <th className="p-2 text-right">{t('low24h')}</th>
              <th className={cn(thClass, 'text-right')} onClick={() => handleSort('volume')}>
                <span className="inline-flex items-center gap-1 flex-row-reverse">
                  {t('volume')} <SortIcon active={sortKey === 'volume'} dir={sortDir} />
                </span>
              </th>
              <th className="p-2 text-center w-28">Chart</th>
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-muted-foreground">
                  {filter ? `"${filter}" — no results` : t('waiting')}
                </td>
              </tr>
            ) : (
              processed.map((tick) => (
                <TickerRow
                  key={`${tick.exchange}:${tick.symbol}`}
                  tick={tick}
                  krwPerUsd={krwPerUsd}
                  baseCurrency={baseCurrency}
                  onRowClick={onRowClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
