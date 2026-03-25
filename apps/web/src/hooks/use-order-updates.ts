'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrderUpdatesStore } from '@/stores/use-order-updates-store';

export function useOrderUpdates(userId: string | null) {
  const queryClient = useQueryClient();
  const connect = useOrderUpdatesStore((s) => s.connect);
  const disconnect = useOrderUpdatesStore((s) => s.disconnect);

  useEffect(() => {
    if (!userId) return;
    connect(userId, queryClient);
    return () => disconnect();
  }, [userId, queryClient, connect, disconnect]);
}
