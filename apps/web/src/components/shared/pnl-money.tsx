'use client';

import { useBaseCurrency } from '@/hooks/use-base-currency';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { formatCurrency } from '@/lib/utils';

interface PnlMoneyProps {
  /** Profit/loss in USD. Sign drives color; '+' is prefixed for positive. */
  usd: number | null | undefined;
  showSub?: boolean;
  className?: string;
}

export function PnlMoney({ usd, showSub = true, className }: PnlMoneyProps) {
  const { currency } = useBaseCurrency();
  const { krwPerUsd } = useExchangeRate();

  if (usd == null || !Number.isFinite(usd)) {
    return <span className={`text-muted-foreground ${className ?? ''}`}>-</span>;
  }

  const color =
    usd > 0
      ? 'text-green-600 dark:text-green-400'
      : usd < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  const { main, sub } = formatCurrency(usd, currency, krwPerUsd);
  const sign = usd > 0 ? '+' : '';

  return (
    <span className={`font-bold tabular-nums ${color} ${className ?? ''}`}>
      {sign}
      {main}
      {showSub && sub && <span className="text-xs ml-1 font-normal opacity-70">{sub}</span>}
    </span>
  );
}
