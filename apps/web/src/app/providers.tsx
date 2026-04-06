'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isDemo } from '@/lib/demo';

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
  const [mswReady, setMswReady] = useState(!isDemo);

  useEffect(() => {
    if (!isDemo) return;

    import('@/mocks/browser').then(({ worker }) => {
      worker.start({ onUnhandledRequest: 'bypass' }).then(() => {
        setMswReady(true);
      });
    });
  }, []);

  if (!mswReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {!isDemo && <AuthRefreshListener queryClient={queryClient} />}
      {children}
    </QueryClientProvider>
  );
}
