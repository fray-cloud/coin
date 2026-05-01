'use client';

import { use } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderChart } from '@/components/order-chart';
import { CloseReasonBadge } from '@/components/close-reason-badge';
import { PnlValue } from '@/components/shared/pnl-value';
import { useBaseCurrency } from '@/hooks/use-base-currency';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { closePosition, getOrder } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { currency } = useBaseCurrency();
  const { krwPerUsd } = useExchangeRate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id),
    refetchInterval: 5000,
  });

  const closeMut = useMutation({
    mutationFn: () => closePosition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <Link
          href="/activity"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <p className="text-muted-foreground mt-4">주문을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { order, decision, network, markPrice, unrealizedPnl } = data;
  const isOpen = order.status === 'filled' && !order.closedAt;
  const isReal = order.mode === 'real';
  const canClose = isOpen && isReal;
  const sideColor = order.side === 'long' ? 'text-green-500' : 'text-red-500';

  const entryPrice = order.entryPrice ? Number(order.entryPrice) : null;
  const tpPrice = order.takeProfitPrice ? Number(order.takeProfitPrice) : null;
  const slPrice = order.stopLossPrice ? Number(order.stopLossPrice) : null;

  const formatUsd = (n: number | null) => {
    if (n == null) return '-';
    const { main, sub } = formatCurrency(n, currency, krwPerUsd);
    return sub ? (
      <span className="tabular-nums">
        {main} <span className="text-xs text-muted-foreground">{sub}</span>
      </span>
    ) : (
      <span className="tabular-nums">{main}</span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="space-y-1">
          <Link
            href="/activity"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Activity
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{order.symbol}</h1>
            <span className={`text-lg font-semibold uppercase ${sideColor}`}>{order.side}</span>
            <Badge variant="info">{order.closedAt ? 'closed' : order.status}</Badge>
            <Badge variant={network === 'mainnet' ? 'orange' : 'purple'}>
              {network === 'mainnet' ? '실거래' : '모의'}
            </Badge>
            {order.leverage ? <Badge variant="muted">{order.leverage}x</Badge> : null}
            <CloseReasonBadge reason={order.closeReason} />
          </div>
        </div>
        {canClose && (
          <Button
            variant="destructive"
            onClick={() => closeMut.mutate()}
            disabled={closeMut.isPending}
            className="gap-1"
          >
            <X size={14} />
            {closeMut.isPending ? '종료 요청 중...' : '포지션 종료'}
          </Button>
        )}
      </div>

      {closeMut.isError && (
        <p className="text-sm text-red-500">
          {closeMut.error instanceof Error ? closeMut.error.message : '종료 요청 실패'}
        </p>
      )}
      {closeMut.isSuccess && (
        <p className="text-sm text-green-500">종료 요청이 접수되었습니다. 거래소에서 처리 중...</p>
      )}

      <Card>
        <CardContent className="pt-4">
          <OrderChart
            exchange={order.exchange}
            symbol={order.symbol}
            entryPrice={entryPrice}
            takeProfitPrice={tpPrice}
            stopLossPrice={slPrice}
          />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">포지션</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <Row
              label="수량"
              value={<span className="tabular-nums">{order.filledQuantity || order.quantity}</span>}
            />
            <Row label="진입가" value={formatUsd(entryPrice)} />
            <Row label="현재가 (Mark)" value={formatUsd(markPrice)} />
            <Row label="익절 (TP)" value={formatUsd(tpPrice)} />
            <Row label="손절 (SL)" value={formatUsd(slPrice)} />
            {order.realizedPnl ? (
              <Row label="실현 손익" value={<PnlValue value={Number(order.realizedPnl)} />} />
            ) : (
              <Row
                label="미실현 손익"
                value={unrealizedPnl != null ? <PnlValue value={unrealizedPnl} /> : <span>-</span>}
              />
            )}
            {order.closedAt && (
              <Row
                label="종료 시각"
                value={<span>{new Date(order.closedAt).toLocaleString('ko-KR')}</span>}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">LLM 결정</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {decision ? (
              <>
                <Row
                  label="모델"
                  value={
                    <span className="font-mono text-xs">
                      {decision.model} ({decision.latencyMs}ms)
                    </span>
                  }
                />
                <Row
                  label="시그널"
                  value={
                    <span
                      className={`uppercase font-medium ${decision.parsedSignal.signal === 'long' ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {decision.parsedSignal.signal}
                    </span>
                  }
                />
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">근거</p>
                  <p className="text-sm whitespace-pre-wrap">{decision.parsedSignal.reasoning}</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">연결된 LLM 결정이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {value}
    </div>
  );
}
