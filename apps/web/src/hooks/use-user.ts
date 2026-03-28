'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getMe, logout as apiLogout } from '@/lib/api-client';

export function useUser() {
  const { data: user = null, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: getMe,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return { user, isLoading };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    await apiLogout();
    queryClient.setQueryData(['user'], null);
    queryClient.removeQueries({ queryKey: ['user'] });
    router.push('/login');
  };
}
