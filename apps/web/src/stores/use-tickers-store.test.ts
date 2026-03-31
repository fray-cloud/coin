import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSocket } from './__test-helpers__/mock-socket';

const mockSocket = createMockSocket();
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

const { useTickersStore } = await import('./use-tickers-store');

describe('useTickersStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useTickersStore.setState({
      tickers: new Map(),
      connected: false,
      _socket: null,
      _refCount: 0,
      _disconnectTimer: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('connect 호출 시 소켓 이벤트를 등록해야 한다', () => {
    useTickersStore.getState().connect();

    const registeredEvents = mockSocket.on.mock.calls.map((c: unknown[]) => c[0]);
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('disconnect');
    expect(registeredEvents).toContain('ticker');
  });

  it('중복 connect 시 소켓 이벤트를 재등록하지 않아야 한다', () => {
    useTickersStore.getState().connect();
    const firstCallCount = mockSocket.on.mock.calls.length;

    useTickersStore.getState().connect();
    expect(mockSocket.on.mock.calls.length).toBe(firstCallCount);
  });

  it('모든 구독 해제 후 지연 뒤 소켓을 종료해야 한다', () => {
    useTickersStore.getState().connect();
    useTickersStore.getState().disconnect();

    vi.advanceTimersByTime(200);
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('React Strict Mode 재마운트 시 disconnect → connect가 소켓을 유지해야 한다', () => {
    useTickersStore.getState().connect();
    useTickersStore.getState().disconnect();
    // 즉시 다시 connect (Strict Mode 시뮬레이션)
    useTickersStore.getState().connect();

    vi.advanceTimersByTime(200);
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });

  it('getTickersArray가 Map을 배열로 변환해야 한다', () => {
    const ticker = {
      exchange: 'upbit' as const,
      symbol: 'KRW-BTC',
      price: '50000000',
      volume24h: '100',
      change24h: '500000',
      changePercent24h: '1.0',
      high24h: '51000000',
      low24h: '49000000',
      timestamp: Date.now(),
    };
    useTickersStore.setState({
      tickers: new Map([['upbit:KRW-BTC', ticker]]),
    });

    const arr = useTickersStore.getState().getTickersArray();
    expect(arr).toHaveLength(1);
    expect(arr[0].symbol).toBe('KRW-BTC');
  });
});
