'use client';

import { useQuery } from '@tanstack/react-query';
import { getStrategyLogs, getStrategyPerformance } from '@/lib/api-client';

export type StrategyRunStatus = 'idle' | 'signal' | 'order_placed' | 'risk_blocked' | 'error';

const ACTION_TO_STATUS: Record<string, StrategyRunStatus> = {
  signal_generated: 'signal',
  order_placed: 'order_placed',
  risk_blocked: 'risk_blocked',
  error: 'error',
};

export interface StrategyRuntime {
  status: StrategyRunStatus;
  lastActivityAt: string | null;
  realizedPnl: number | null;
}

export function useStrategyRuntime(strategyId: string, enabled: boolean): StrategyRuntime {
  const { data: logsData } = useQuery({
    queryKey: ['strategyLogs', strategyId, 'last1'],
    queryFn: () => getStrategyLogs(strategyId, undefined, 1),
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: performance } = useQuery({
    queryKey: ['strategyPerformance', strategyId],
    queryFn: () => getStrategyPerformance(strategyId),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const lastLog = logsData?.items[0] ?? null;
  const status: StrategyRunStatus = lastLog ? (ACTION_TO_STATUS[lastLog.action] ?? 'idle') : 'idle';

  return {
    status,
    lastActivityAt: lastLog?.createdAt ?? null,
    realizedPnl: performance?.realizedPnl ?? null,
  };
}
