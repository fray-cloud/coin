import { Badge } from '@/components/ui/badge';
import type { CloseReason } from '@/lib/api-client';

const LABEL: Record<
  CloseReason,
  { text: string; variant: 'success' | 'error' | 'info' | 'muted' | 'warning' }
> = {
  take_profit: { text: 'TP 익절', variant: 'success' },
  stop_loss: { text: 'SL 손절', variant: 'error' },
  liquidation: { text: '청산', variant: 'error' },
  manual: { text: '수동 종료', variant: 'info' },
  manual_on_exchange: { text: '거래소에서 종료', variant: 'warning' },
  reconciled_unknown: { text: '동기화', variant: 'muted' },
};

export function CloseReasonBadge({ reason }: { reason: CloseReason | null | undefined }) {
  if (!reason) return null;
  const meta = LABEL[reason] ?? { text: reason, variant: 'muted' as const };
  return <Badge variant={meta.variant}>{meta.text}</Badge>;
}
