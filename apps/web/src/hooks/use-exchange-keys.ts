'use client';

import { useQuery } from '@tanstack/react-query';
import { getExchangeKeys } from '@/lib/api-client';

export function useExchangeKeys() {
  return useQuery({
    queryKey: ['exchangeKeys'],
    queryFn: getExchangeKeys,
  });
}
