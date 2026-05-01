'use client';

import { useQuery } from '@tanstack/react-query';
import { getPortfolioSummary, type PortfolioNetwork } from '@/lib/api-client';

export function usePortfolio(network: PortfolioNetwork = 'all') {
  return useQuery({
    queryKey: ['portfolio', network],
    queryFn: () => getPortfolioSummary(network),
    staleTime: 60_000,
  });
}
