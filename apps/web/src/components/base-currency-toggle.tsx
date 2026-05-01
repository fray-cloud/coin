'use client';

import { useBaseCurrency } from '@/hooks/use-base-currency';

export function BaseCurrencyToggle() {
  const { currency, setCurrency } = useBaseCurrency();

  return (
    <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
      {(['KRW', 'USD'] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          className={`px-2 py-0.5 rounded ${
            currency === c
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={currency === c}
          aria-label={`Display values in ${c}`}
        >
          {c === 'KRW' ? '₩' : '$'}
        </button>
      ))}
    </div>
  );
}
