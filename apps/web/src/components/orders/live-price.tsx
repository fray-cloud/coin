'use client';

import { useEffect, useRef, useState } from 'react';
import type { Ticker } from '@coin/types';
import { formatPrice } from '@/lib/utils';

export function LivePrice({ ticker }: { ticker: Ticker }) {
  const prevPrice = useRef(ticker.price);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (ticker.price !== prevPrice.current) {
      const direction = Number(ticker.price) > Number(prevPrice.current) ? 'up' : 'down';
      setFlash(direction);
      prevPrice.current = ticker.price;
      const timer = setTimeout(() => setFlash(null), 300);
      return () => clearTimeout(timer);
    }
  }, [ticker.price]);

  const changeNum = Number(ticker.changePercent24h);
  const changeColor =
    changeNum > 0 ? 'text-green-500' : changeNum < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`text-2xl font-bold tabular-nums transition-colors duration-300 ${
          flash === 'up' ? 'text-green-400' : flash === 'down' ? 'text-red-400' : ''
        }`}
      >
        {formatPrice(ticker.price)}
      </span>
      <span className={`text-sm font-medium ${changeColor}`}>
        {changeNum > 0 ? '+' : ''}
        {changeNum.toFixed(2)}%
      </span>
    </div>
  );
}
