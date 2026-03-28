'use client';

import { useState } from 'react';

interface ExchangeIconProps {
  exchange: string;
  size?: number;
  className?: string;
}

const EXCHANGE_LOGOS: Record<string, string> = {
  upbit: 'https://static.upbit.com/logos/UPBIT.png',
  binance: 'https://bin.bnbstatic.com/static/images/common/logo.png',
  bybit: 'https://www.bybit.com/favicon.ico',
};

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

export function ExchangeIcon({ exchange, size = 20, className }: ExchangeIconProps) {
  const key = exchange.toLowerCase();
  const logoUrl = EXCHANGE_LOGOS[key];
  const [error, setError] = useState(false);

  if (!logoUrl || error) {
    return <Fallback char={exchange.charAt(0).toUpperCase()} size={size} />;
  }

  return (
    <span className={className} style={{ display: 'inline-flex', flexShrink: 0 }}>
      <img
        src={logoUrl}
        alt={exchange}
        width={size}
        height={size}
        style={{ borderRadius: '50%', objectFit: 'contain' }}
        onError={() => setError(true)}
      />
    </span>
  );
}
