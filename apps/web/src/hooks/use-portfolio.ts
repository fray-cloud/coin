'use client';

import { useQuery } from '@tanstack/react-query';
import { getPortfolioSummary } from '@/lib/api-client';

export function usePortfolio(mode: 'paper' | 'real' | 'all' = 'all') {
  return useQuery({
    queryKey: ['portfolio', mode],
    queryFn: () => getPortfolioSummary(mode),
    staleTime: 60_000,
  });
}
