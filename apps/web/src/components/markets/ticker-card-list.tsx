'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, ShoppingCart } from 'lucide-react';
import type { Ticker } from '@coin/types';
import { CoinIcon, ExchangeIcon } from '@/components/icons';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { useBaseCurrency } from '@/hooks/use-base-currency';
import { formatPrice } from '@/lib/utils';
import { QuickOrderPanel } from '@/components/orders/quick-order-panel';

interface TickerCardListProps {
  tickers: Ticker[];
}

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

const SWIPE_THRESHOLD = 60;

function SwipableTickerCard({
  ticker,
  onQuickOrder,
}: {
  ticker: Ticker;
  onQuickOrder: (ticker: Ticker) => void;
}) {
  const { krwPerUsd } = useExchangeRate();
  const { currency: baseCurrency } = useBaseCurrency();

  const touchStartX = useRef<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [swiped, setSwiped] = useState(false);

  const changeNum = Number(ticker.changePercent24h);
  const changeColor =
    changeNum > 0 ? 'text-green-500' : changeNum < 0 ? 'text-red-500' : 'text-muted-foreground';

  const { main: mainPrice, sub: subPrice } = getDisplayPrices(
    ticker.price,
    ticker.exchange,
    krwPerUsd,
    baseCurrency,
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiped(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    // Only allow left swipe (negative delta)
    if (delta < 0) {
      setOffsetX(Math.max(delta, -96));
    } else if (swiped) {
      setOffsetX(Math.min(0, -96 + delta));
    }
  };

  const handleTouchEnd = () => {
    if (offsetX < -SWIPE_THRESHOLD) {
      setOffsetX(-80);
      setSwiped(true);
    } else {
      setOffsetX(0);
      setSwiped(false);
    }
    touchStartX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      {/* Swipe action button */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-green-600">
        <button
          type="button"
          onClick={() => {
            setOffsetX(0);
            setSwiped(false);
            onQuickOrder(ticker);
          }}
          className="flex flex-col items-center gap-1 text-white text-xs font-medium"
        >
          <ShoppingCart size={18} />
          <span>Order</span>
        </button>
      </div>

      {/* Card content */}
      <div
        className="relative bg-card transition-transform duration-150"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Link
          href={`/markets/${ticker.exchange}/${encodeURIComponent(ticker.symbol)}`}
          className="block p-3.5 active:bg-muted/50"
          onClick={(e) => {
            // Don't navigate if card is swiped
            if (swiped || offsetX < -10) e.preventDefault();
          }}
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
              {subPrice && (
                <div className="text-xs text-muted-foreground tabular-nums">{subPrice}</div>
              )}
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
      </div>
    </div>
  );
}

export function TickerCardList({ tickers }: TickerCardListProps) {
  const t = useTranslations('ticker');
  const [filter, setFilter] = useState('');
  const [quickOrderTicker, setQuickOrderTicker] = useState<Ticker | null>(null);

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
          <p className="text-xs text-muted-foreground">← Swipe left for quick order</p>
          {filtered.map((ticker) => (
            <SwipableTickerCard
              key={`${ticker.exchange}:${ticker.symbol}`}
              ticker={ticker}
              onQuickOrder={setQuickOrderTicker}
            />
          ))}
        </div>
      )}

      <QuickOrderPanel ticker={quickOrderTicker} onClose={() => setQuickOrderTicker(null)} />
    </div>
  );
}
