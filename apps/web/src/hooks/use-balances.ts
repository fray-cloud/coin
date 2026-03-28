'use client';

import { useQuery } from '@tanstack/react-query';
import { getBalances } from '@/lib/api-client';

export function useBalances(keyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['balances', keyId],
    queryFn: () => getBalances(keyId!),
    enabled: !!keyId && enabled,
    staleTime: 30_000,
  });
}
