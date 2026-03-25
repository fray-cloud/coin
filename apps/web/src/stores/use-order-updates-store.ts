import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';

interface OrderUpdatesState {
  _socket: Socket | null;
  _userId: string | null;
  connect: (userId: string, queryClient: QueryClient) => void;
  disconnect: () => void;
}

export const useOrderUpdatesStore = create<OrderUpdatesState>((set, get) => ({
  _socket: null,
  _userId: null,

  connect: (userId: string, queryClient: QueryClient) => {
    const state = get();

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

    set({ _socket: socket, _userId: userId });
  },

  disconnect: () => {
    const state = get();
    if (state._socket) {
      state._socket.disconnect();
      set({ _socket: null, _userId: null });
    }
  },
}));
