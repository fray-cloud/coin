'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function AuthRefreshListener({ queryClient }: { queryClient: QueryClient }) {
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    };
    window.addEventListener('auth:refresh', handler);
    return () => window.removeEventListener('auth:refresh', handler);
  }, [queryClient]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthRefreshListener queryClient={queryClient} />
      {children}
    </QueryClientProvider>
  );
}
