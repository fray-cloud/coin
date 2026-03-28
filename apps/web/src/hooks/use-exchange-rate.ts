'use client';

import { useQuery } from '@tanstack/react-query';
import { getExchangeRate } from '@/lib/api-client';

export function useExchangeRate() {
  const { data, isLoading } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: getExchangeRate,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    krwPerUsd: data?.krwPerUsd ?? 0,
    updatedAt: data?.updatedAt ?? null,
    isLoading,
  };
}
