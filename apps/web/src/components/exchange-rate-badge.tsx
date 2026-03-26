'use client';

import { useExchangeRate } from '@/hooks/use-exchange-rate';

export function ExchangeRateBadge() {
  const { krwPerUsd, isLoading } = useExchangeRate();

  if (isLoading || !krwPerUsd) return null;

  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      1 USD = {krwPerUsd.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} KRW
    </span>
  );
}
