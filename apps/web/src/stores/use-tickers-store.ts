import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { Ticker } from '@coin/types';

interface TickersState {
  tickers: Map<string, Ticker>;
  connected: boolean;
  _socket: Socket | null;
  _refCount: number;
  _disconnectTimer: ReturnType<typeof setTimeout> | null;
  connect: () => void;
  disconnect: () => void;
  getTickersArray: () => Ticker[];
}

// Buffer incoming tickers and flush every 500ms to avoid excessive re-renders
let tickerBuffer: Map<string, Ticker> = new Map();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(set: (fn: (prev: TickersState) => Partial<TickersState>) => void) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (tickerBuffer.size === 0) return;
    const batch = tickerBuffer;
    tickerBuffer = new Map();
    set((prev) => {
      const next = new Map(prev.tickers);
      for (const [key, ticker] of batch) {
        next.set(key, ticker);
      }
      return { tickers: next };
    });
  }, 500);
}

export const useTickersStore = create<TickersState>((set, get) => ({
  tickers: new Map(),
  connected: false,
  _socket: null,
  _refCount: 0,
  _disconnectTimer: null,

  connect: () => {
    const state = get();

    // Cancel pending disconnect (React Strict Mode remount)
    if (state._disconnectTimer) {
      clearTimeout(state._disconnectTimer);
      set({ _disconnectTimer: null });
    }

    set({ _refCount: state._refCount + 1 });

    if (state._socket) return;

    const socket = io({
      path: '/ws',
      transports: ['websocket'],
    });

    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));

    socket.on('ticker', (ticker: Ticker) => {
      tickerBuffer.set(`${ticker.exchange}:${ticker.symbol}`, ticker);
      scheduleFlush(set);
    });

    set({ _socket: socket });
  },

  disconnect: () => {
    const state = get();
    const nextRef = Math.max(0, state._refCount - 1);
    set({ _refCount: nextRef });

    if (nextRef === 0 && state._socket) {
      // Delay actual disconnect to survive React Strict Mode remount
      const timer = setTimeout(() => {
        const current = get();
        if (current._refCount === 0 && current._socket) {
          current._socket.disconnect();
          set({ _socket: null, connected: false, _disconnectTimer: null });
        }
      }, 100);
      set({ _disconnectTimer: timer });
    }
  },

  getTickersArray: () => Array.from(get().tickers.values()),
}));
