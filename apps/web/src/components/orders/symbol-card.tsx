'use client';

import type { Ticker } from '@coin/types';
import { CoinIcon } from '@/components/icons';
import { formatPrice } from '@/lib/utils';

export function SymbolCard({
  ticker,
  selected,
  onClick,
}: {
  ticker: Ticker;
  selected: boolean;
  onClick: () => void;
}) {
  const changeNum = Number(ticker.changePercent24h);
  const changeColor =
    changeNum > 0 ? 'text-green-500' : changeNum < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm flex items-center gap-1.5">
          <CoinIcon symbol={ticker.symbol} size={16} />
          {ticker.symbol}
        </span>
        <span className={`text-xs font-medium ${changeColor}`}>
          {changeNum > 0 ? '+' : ''}
          {changeNum.toFixed(2)}%
        </span>
      </div>
      <div className="text-base font-bold tabular-nums mt-0.5">{formatPrice(ticker.price)}</div>
      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
        <span>H {formatPrice(ticker.high24h)}</span>
        <span>L {formatPrice(ticker.low24h)}</span>
      </div>
    </button>
  );
}
