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
