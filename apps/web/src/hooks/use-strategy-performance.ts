'use client';

import { useQuery } from '@tanstack/react-query';
import { getStrategyPerformance } from '@/lib/api-client';

export function useStrategyPerformance(strategyId: string) {
  return useQuery({
    queryKey: ['strategyPerformance', strategyId],
    queryFn: () => getStrategyPerformance(strategyId),
    staleTime: 30_000,
  });
}
