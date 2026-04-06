'use client';

import { useQuery } from '@tanstack/react-query';
import { getFlows, getFlow } from '@/lib/api-client';

export function useFlows() {
  return useQuery({
    queryKey: ['flows'],
    queryFn: getFlows,
  });
}

export function useFlow(id: string) {
  return useQuery({
    queryKey: ['flow', id],
    queryFn: () => getFlow(id),
    enabled: !!id,
  });
}
