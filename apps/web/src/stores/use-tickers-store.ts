import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { Ticker } from '@coin/types';

interface TickersState {
  tickers: Map<string, Ticker>;
  connected: boolean;
  _socket: Socket | null;
  _refCount: number;
  connect: () => void;
  disconnect: () => void;
  getTickersArray: () => Ticker[];
}

export const useTickersStore = create<TickersState>((set, get) => ({
  tickers: new Map(),
  connected: false,
  _socket: null,
  _refCount: 0,

  connect: () => {
    const state = get();
    set({ _refCount: state._refCount + 1 });

    if (state._socket) return;

    const socket = io({
      path: '/ws',
      transports: ['websocket'],
    });

    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));

    socket.on('ticker', (ticker: Ticker) => {
      set((prev) => {
        const next = new Map(prev.tickers);
        next.set(`${ticker.exchange}:${ticker.symbol}`, ticker);
        return { tickers: next };
      });
    });

    set({ _socket: socket });
  },

  disconnect: () => {
    const state = get();
    const nextRef = Math.max(0, state._refCount - 1);
    set({ _refCount: nextRef });

    if (nextRef === 0 && state._socket) {
      state._socket.disconnect();
      set({ _socket: null, connected: false });
    }
  },

  getTickersArray: () => Array.from(get().tickers.values()),
}));
