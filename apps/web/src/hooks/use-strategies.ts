'use client';

import { useQuery } from '@tanstack/react-query';
import { getStrategies } from '@/lib/api-client';

export function useStrategies() {
  return useQuery({
    queryKey: ['strategies'],
    queryFn: getStrategies,
  });
}
