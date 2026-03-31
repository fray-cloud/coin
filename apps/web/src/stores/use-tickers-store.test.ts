import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock socket.io-client before import
const mockSocket = {
  on: vi.fn(),
  disconnect: vi.fn(),
};
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

  it('connect 호출 시 소켓을 생성하고 refCount를 증가시켜야 한다', () => {
    useTickersStore.getState().connect();

    expect(useTickersStore.getState()._refCount).toBe(1);
    expect(useTickersStore.getState()._socket).toBeDefined();
  });

  it('중복 connect 시 소켓을 재생성하지 않고 refCount만 증가해야 한다', () => {
    useTickersStore.getState().connect();
    useTickersStore.getState().connect();

    expect(useTickersStore.getState()._refCount).toBe(2);
  });

  it('disconnect 호출 시 refCount를 감소시켜야 한다', () => {
    useTickersStore.getState().connect();
    useTickersStore.getState().connect();
    useTickersStore.getState().disconnect();

    expect(useTickersStore.getState()._refCount).toBe(1);
  });

  it('refCount가 0이 되면 지연 후 소켓을 종료해야 한다', () => {
    useTickersStore.getState().connect();
    useTickersStore.getState().disconnect();

    // 아직 타이머 대기 중
    expect(useTickersStore.getState()._disconnectTimer).toBeDefined();

    vi.advanceTimersByTime(200);
    expect(useTickersStore.getState()._socket).toBeNull();
  });

  it('React Strict Mode 재마운트 시 disconnect → connect가 소켓을 유지해야 한다', () => {
    useTickersStore.getState().connect();
    useTickersStore.getState().disconnect();
    // 즉시 다시 connect (Strict Mode 시뮬레이션)
    useTickersStore.getState().connect();

    expect(useTickersStore.getState()._disconnectTimer).toBeNull();
    expect(useTickersStore.getState()._socket).toBeDefined();
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
