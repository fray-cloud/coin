'use client';

import { useBaseCurrency } from '@/hooks/use-base-currency';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { formatCurrency } from '@/lib/utils';

interface MoneyValueProps {
  /** Amount in USD (or USDT — same thing for our purposes). */
  usd: number | null | undefined;
  className?: string;
  showSub?: boolean;
}

/**
 * Render a USD-denominated value in the user's chosen base currency,
 * with a smaller secondary label in the alternate currency. When the
 * exchange rate is unavailable we just print USD.
 */
export function MoneyValue({ usd, className, showSub = true }: MoneyValueProps) {
  const { currency } = useBaseCurrency();
  const { krwPerUsd } = useExchangeRate();

  if (usd == null || !Number.isFinite(usd)) return <span className={className}>-</span>;

  const { main, sub } = formatCurrency(usd, currency, krwPerUsd);
  return (
    <span className={className}>
      <span className="tabular-nums">{main}</span>
      {showSub && sub && <span className="text-xs text-muted-foreground ml-1">{sub}</span>}
    </span>
  );
}
