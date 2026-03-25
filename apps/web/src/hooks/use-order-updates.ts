'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

interface OrderUpdate {
  orderId: string;
  status: string;
  filledQuantity: string;
  filledPrice: string;
  fee: string;
  feeCurrency: string;
}

export function useOrderUpdates(userId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const socket = io({
      path: '/ws',
      transports: ['websocket'],
      query: { userId },
    });

    socketRef.current = socket;

    socket.on('order:updated', (_update: OrderUpdate) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, queryClient]);
}
