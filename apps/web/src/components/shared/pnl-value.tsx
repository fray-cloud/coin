import { formatKrw } from '@/lib/utils';

export function PnlValue({ value, prefix = '' }: { value: number; prefix?: string }) {
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-muted-foreground';
  const sign = value > 0 ? '+' : '';
  return (
    <span className={`font-bold ${color}`}>
      {prefix}
      {sign}
      {formatKrw(value)}
    </span>
  );
}
