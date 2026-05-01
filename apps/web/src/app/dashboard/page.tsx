'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PnlValue } from '@/components/shared/pnl-value';
import { closePosition, getDashboardSummary, type DashboardSummary } from '@/lib/api-client';
import { useBaseCurrency } from '@/hooks/use-base-currency';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardSummary,
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <p className="text-muted-foreground">대시보드를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      <PnlSection pnl={data.pnl} />
      <OpenPositionsSection positions={data.openPositions} />
      <RecentDecisionsSection decisions={data.recentDecisions} />
    </div>
  );
}

function PnlSection({ pnl }: { pnl: DashboardSummary['pnl'] }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {(['today', 'week'] as const).map((window) => (
        <Card key={window}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {window === 'today' ? '오늘 실현 손익' : '이번주 실현 손익'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-purple-500 mb-1">모의 (Testnet)</p>
              <p className="text-xl tabular-nums">
                <PnlValue value={pnl[window].testnet} />
              </p>
            </div>
            <div>
              <p className="text-xs text-orange-500 mb-1">실거래 (Mainnet)</p>
              <p className="text-xl tabular-nums">
                <PnlValue value={pnl[window].mainnet} />
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OpenPositionsSection({ positions }: { positions: DashboardSummary['openPositions'] }) {
  const queryClient = useQueryClient();
  const { currency } = useBaseCurrency();
  const { krwPerUsd } = useExchangeRate();

  const closeMut = useMutation({
    mutationFn: (id: string) => closePosition(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  });

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">활성 포지션</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">현재 열려있는 포지션이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">활성 포지션 ({positions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 px-2">심볼</th>
                <th className="text-left py-2 px-2">방향</th>
                <th className="text-right py-2 px-2">수량</th>
                <th className="text-right py-2 px-2">진입가</th>
                <th className="text-right py-2 px-2">현재가</th>
                <th className="text-right py-2 px-2">미실현 P&L</th>
                <th className="text-right py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const entry = p.entryPrice ? Number(p.entryPrice) : null;
                const entryFmt = entry != null ? formatCurrency(entry, currency, krwPerUsd) : null;
                const markFmt =
                  p.markPrice != null ? formatCurrency(p.markPrice, currency, krwPerUsd) : null;
                const network = p.exchangeKey?.network ?? 'mainnet';
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/40">
                    <td className="py-2 px-2">
                      <Link
                        href={`/orders/${p.id}`}
                        className="font-medium hover:underline inline-flex items-center gap-1"
                      >
                        {p.symbol}
                        <ChevronRight size={12} />
                      </Link>
                      <Badge
                        variant={network === 'mainnet' ? 'orange' : 'purple'}
                        className="ml-2 text-[10px]"
                      >
                        {network === 'mainnet' ? '실거래' : '모의'}
                      </Badge>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`uppercase font-medium ${p.side === 'long' ? 'text-green-500' : 'text-red-500'}`}
                      >
                        {p.side}
                      </span>
                      {p.leverage ? (
                        <span className="text-xs text-muted-foreground ml-1">{p.leverage}x</span>
                      ) : null}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {p.filledQuantity || p.quantity}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">{entryFmt?.main ?? '-'}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{markFmt?.main ?? '-'}</td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {p.unrealizedPnl != null ? <PnlValue value={p.unrealizedPnl} /> : '-'}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {p.mode === 'real' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => closeMut.mutate(p.id)}
                          disabled={closeMut.isPending}
                          className="gap-1"
                        >
                          <X size={12} />
                          종료
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentDecisionsSection({ decisions }: { decisions: DashboardSummary['recentDecisions'] }) {
  if (decisions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 LLM 결정</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">아직 LLM 시그널 기록이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최근 LLM 결정 (최대 5건)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {decisions.map((d) => {
          const outcome = describeOutcome(d.order);
          return (
            <div key={d.id} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{d.order?.symbol ?? '—'}</span>
                  <span
                    className={`uppercase text-sm font-medium ${d.parsedSignal.signal === 'long' ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {d.parsedSignal.signal}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    TP {d.parsedSignal.takeProfitPrice} · SL {d.parsedSignal.stopLossPrice}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={outcome.variant}>{outcome.label}</Badge>
                  {d.order && (
                    <Link
                      href={`/orders/${d.order.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center"
                    >
                      상세 <ChevronRight size={12} />
                    </Link>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {d.parsedSignal.reasoning}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(d.createdAt).toLocaleString('ko-KR')} · {d.model} ({d.latencyMs}ms)
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

type Outcome = { label: string; variant: 'success' | 'error' | 'info' | 'muted' };

function describeOutcome(order: DashboardSummary['recentDecisions'][number]['order']): Outcome {
  if (!order) return { label: '미실행', variant: 'muted' };
  if (order.status === 'pending') return { label: '진행 중', variant: 'info' };
  if (order.status === 'failed') return { label: '실패', variant: 'error' };
  if (order.closedAt) {
    const pnl = Number(order.realizedPnl ?? 0);
    if (pnl > 0) return { label: 'TP / 익절', variant: 'success' };
    if (pnl < 0) return { label: 'SL / 손절', variant: 'error' };
    return { label: '종료', variant: 'muted' };
  }
  return { label: '활성', variant: 'info' };
}
