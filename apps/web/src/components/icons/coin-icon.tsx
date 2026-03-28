'use client';

import { useState } from 'react';

interface CoinIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

function parseSymbol(symbol: string): string {
  if (symbol.includes('-')) {
    return symbol.split('-').pop()!;
  }
  for (const quote of ['USDT', 'BUSD', 'USD', 'USDC']) {
    if (symbol.endsWith(quote)) {
      return symbol.slice(0, -quote.length);
    }
  }
  return symbol;
}

function Fallback({ char, size }: { char: string; size: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45, fontWeight: 700 }}
    >
      {char}
    </span>
  );
}

export function CoinIcon({ symbol, size = 20, className }: CoinIconProps) {
  const base = parseSymbol(symbol).toUpperCase();
  const [error, setError] = useState(false);

  if (error) {
    return <Fallback char={base.charAt(0)} size={size} />;
  }

  return (
    <span className={className} style={{ display: 'inline-flex', flexShrink: 0 }}>
      <img
        src={`https://static.upbit.com/logos/${base}.png`}
        alt={base}
        width={size}
        height={size}
        style={{ borderRadius: '50%' }}
        onError={() => setError(true)}
      />
    </span>
  );
}
