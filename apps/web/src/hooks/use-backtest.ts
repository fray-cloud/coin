'use client';

import { useQuery } from '@tanstack/react-query';
import { getBacktests, getBacktestTrace } from '@/lib/api-client';

export function useBacktests(flowId: string) {
  return useQuery({
    queryKey: ['backtests', flowId],
    queryFn: () => getBacktests(flowId),
    enabled: !!flowId,
  });
}

export function useBacktestTrace(
  flowId: string,
  backtestId: string | null,
  params?: { from?: string; to?: string; limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: ['backtest-trace', flowId, backtestId, params],
    queryFn: () => getBacktestTrace(flowId, backtestId!, params),
    enabled: !!flowId && !!backtestId,
  });
}
