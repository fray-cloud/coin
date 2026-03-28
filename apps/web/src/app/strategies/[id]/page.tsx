'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import { StrategyChart } from '@/components/strategy-chart';
import { getStrategy, toggleStrategy, deleteStrategy } from '@/lib/api-client';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/skeleton';
import { StrategyInfo } from '@/components/strategies/strategy-info';
import { PerformanceCard } from '@/components/strategies/performance-card';
import { ExecutionLogs } from '@/components/strategies/execution-logs';

export default function StrategyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: strategy, isLoading } = useQuery({
    queryKey: ['strategy', id],
    queryFn: () => getStrategy(id),
  });

  const toggleMutation = useMutation({
    mutationFn: () => toggleStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy', id] });
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteStrategy(id),
    onSuccess: () => router.push('/strategies'),
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <Card>
          <CardContent className="pt-6">
            <SkeletonChart height={350} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <SkeletonTable rows={5} cols={4} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <p className="text-muted-foreground">Strategy not found</p>
      </div>
    );
  }

  const config = strategy.config as Record<string, unknown>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/strategies" className="hover:underline">
          Strategies
        </Link>
        <span>/</span>
        <span>{strategy.name}</span>
      </div>

      <StrategyInfo
        strategy={strategy}
        onToggle={() => toggleMutation.mutate()}
        onDelete={() => deleteMutation.mutate()}
      />

      <PerformanceCard strategyId={id} mode={strategy.mode} />

      {/* Strategy Chart with Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ExchangeIcon exchange={strategy.exchange} size={18} />
            <CoinIcon symbol={strategy.symbol} size={18} />
            {strategy.exchange.toUpperCase()} — {strategy.symbol}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StrategyChart
            exchange={strategy.exchange}
            symbol={strategy.symbol}
            strategyType={strategy.type}
            config={config}
            candleInterval={strategy.candleInterval}
          />
        </CardContent>
      </Card>

      <ExecutionLogs strategyId={id} />
    </div>
  );
}
