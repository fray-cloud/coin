import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';
import { useToastStore } from './use-toast-store';
import {
  useNotificationFeedStore,
  type NotificationEventType,
} from './use-notification-feed-store';

interface OrderUpdatesState {
  _socket: Socket | null;
  _userId: string | null;
  _disconnectTimer: ReturnType<typeof setTimeout> | null;
  connect: (userId: string, queryClient: QueryClient) => void;
  disconnect: () => void;
}

export const useOrderUpdatesStore = create<OrderUpdatesState>((set, get) => ({
  _socket: null,
  _userId: null,
  _disconnectTimer: null,

  connect: (userId: string, queryClient: QueryClient) => {
    const state = get();

    // Cancel pending disconnect (React Strict Mode remount)
    if (state._disconnectTimer) {
      clearTimeout(state._disconnectTimer);
      set({ _disconnectTimer: null });
    }

    // Already connected for this user
    if (state._socket && state._userId === userId) return;

    // Disconnect previous if user changed
    if (state._socket) {
      state._socket.disconnect();
    }

    const socket = io({
      path: '/ws',
      transports: ['websocket'],
      query: { userId },
    });

    socket.on('order:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    socket.on('strategy:signal', () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    });

    socket.on(
      'notification:received',
      (data: { type: string; title: string; message: string; href?: string }) => {
        const toastType =
          data.type === 'order_filled' || data.type === 'strategy_signal'
            ? 'success'
            : data.type === 'order_failed'
              ? 'error'
              : 'warning';
        useToastStore.getState().addToast({
          type: toastType,
          title: data.title,
          message: data.message,
        });
        useNotificationFeedStore.getState().addNotification({
          type: data.type as NotificationEventType,
          title: data.title,
          message: data.message,
          href: data.href,
        });
      },
    );

    set({ _socket: socket, _userId: userId });
  },

  disconnect: () => {
    const state = get();
    if (state._socket) {
      // Delay actual disconnect to survive React Strict Mode remount
      const timer = setTimeout(() => {
        const current = get();
        if (current._socket && current._disconnectTimer === timer) {
          current._socket.disconnect();
          set({ _socket: null, _userId: null, _disconnectTimer: null });
        }
      }, 100);
      set({ _disconnectTimer: timer });
    }
  },
}));
