'use client';

import { useQuery } from '@tanstack/react-query';
import { getStrategySignals } from '@/lib/api-client';

export function useStrategySignals(strategyId?: string) {
  return useQuery({
    queryKey: ['strategySignals', strategyId],
    queryFn: () => getStrategySignals(strategyId!),
    staleTime: 30_000,
    enabled: !!strategyId,
  });
}
