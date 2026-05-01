import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: string): string {
  const num = Number(price);
  if (num >= 1000) return num.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  if (num >= 1) return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  return num.toLocaleString('ko-KR', { maximumFractionDigits: 8 });
}

export function formatKrw(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
}

export function formatVolume(volume: string): string {
  const num = Number(volume);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

export type BaseCurrency = 'KRW' | 'USD';

/**
 * Render a USD-denominated value with a sub-label in the alternate currency.
 * Returns the main string only (no sub) when the rate is unknown.
 */
export function formatCurrency(
  usd: number,
  baseCurrency: BaseCurrency,
  krwPerUsd: number,
): { main: string; sub: string | null } {
  if (!Number.isFinite(usd)) return { main: '-', sub: null };
  const usdStr = usd.toLocaleString('ko-KR', {
    maximumFractionDigits: Math.abs(usd) >= 1 ? 2 : 6,
  });
  if (!krwPerUsd) return { main: `$${usdStr}`, sub: null };

  if (baseCurrency === 'KRW') {
    const krw = usd * krwPerUsd;
    return {
      main: `${krw < 0 ? '-' : ''}₩${formatKrw(Math.abs(krw))}`,
      sub: `$${usdStr}`,
    };
  }
  return {
    main: `${usd < 0 ? '-' : ''}$${Math.abs(usd).toLocaleString('ko-KR', { maximumFractionDigits: Math.abs(usd) >= 1 ? 2 : 6 })}`,
    sub: `₩${formatKrw(usd * krwPerUsd)}`,
  };
}
