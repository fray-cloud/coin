import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSocket = {
  on: vi.fn(),
  disconnect: vi.fn(),
};
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

const { useOrderUpdatesStore } = await import('./use-order-updates-store');

describe('useOrderUpdatesStore', () => {
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useOrderUpdatesStore.setState({
      _socket: null,
      _userId: null,
      _disconnectTimer: null,
    });
  });

  it('connect 호출 시 소켓을 생성하고 userId를 저장해야 한다', () => {
    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);

    expect(useOrderUpdatesStore.getState()._socket).toBeDefined();
    expect(useOrderUpdatesStore.getState()._userId).toBe('user-1');
  });

  it('같은 userId로 중복 connect 시 소켓을 재생성하지 않아야 한다', () => {
    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);
    const firstSocket = useOrderUpdatesStore.getState()._socket;

    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);
    expect(useOrderUpdatesStore.getState()._socket).toBe(firstSocket);
  });

  it('다른 userId로 connect 시 기존 소켓을 종료하고 새로 생성해야 한다', () => {
    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);
    useOrderUpdatesStore.getState().connect('user-2', mockQueryClient as never);

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(useOrderUpdatesStore.getState()._userId).toBe('user-2');
  });

  it('order:updated 이벤트 수신 시 orders 쿼리를 무효화해야 한다', () => {
    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);

    // Find the order:updated handler from socket.on calls
    const onCall = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'order:updated');
    expect(onCall).toBeDefined();

    // Invoke the handler
    onCall![1]();
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['orders'],
    });
  });

  it('strategy:signal 이벤트 수신 시 strategies 쿼리를 무효화해야 한다', () => {
    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);

    const onCall = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'strategy:signal',
    );
    expect(onCall).toBeDefined();

    onCall![1]();
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['strategies'],
    });
  });

  it('disconnect 호출 시 지연 후 소켓을 종료해야 한다', () => {
    vi.useFakeTimers();

    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);
    useOrderUpdatesStore.getState().disconnect();

    expect(useOrderUpdatesStore.getState()._disconnectTimer).toBeDefined();

    vi.advanceTimersByTime(200);
    expect(mockSocket.disconnect).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
