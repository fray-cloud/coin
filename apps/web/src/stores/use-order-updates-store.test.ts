import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSocket } from './__test-helpers__/mock-socket';

const mockSocket = createMockSocket();
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

  it('connect 호출 시 소켓 이벤트를 등록해야 한다', () => {
    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);

    const registeredEvents = mockSocket.on.mock.calls.map((c: unknown[]) => c[0]);
    expect(registeredEvents).toContain('order:updated');
    expect(registeredEvents).toContain('strategy:signal');
    expect(registeredEvents).toContain('notification:received');
  });

  it('같은 userId로 중복 connect 시 이벤트를 재등록하지 않아야 한다', () => {
    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);
    const firstCallCount = mockSocket.on.mock.calls.length;

    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);
    expect(mockSocket.on.mock.calls.length).toBe(firstCallCount);
  });

  it('다른 userId로 connect 시 기존 소켓을 종료해야 한다', () => {
    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);
    useOrderUpdatesStore.getState().connect('user-2', mockQueryClient as never);

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('order:updated 이벤트 수신 시 orders 쿼리를 무효화해야 한다', () => {
    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);

    const handler = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'order:updated',
    )![1] as () => void;
    handler();

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['orders'],
    });
  });

  it('strategy:signal 이벤트 수신 시 strategies 쿼리를 무효화해야 한다', () => {
    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);

    const handler = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'strategy:signal',
    )![1] as () => void;
    handler();

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['strategies'],
    });
  });

  it('disconnect 호출 시 지연 후 소켓을 종료해야 한다', () => {
    vi.useFakeTimers();

    useOrderUpdatesStore.getState().connect('user-1', mockQueryClient as never);
    useOrderUpdatesStore.getState().disconnect();

    vi.advanceTimersByTime(200);
    expect(mockSocket.disconnect).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
