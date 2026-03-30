import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

let wsInstances: MockWS[] = [];

class MockWS extends EventEmitter {
  readyState = 1;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
  });
  removeAllListeners = vi.fn(() => {
    super.removeAllListeners();
    return this;
  });
  constructor() {
    super();
    wsInstances.push(this);
    this.on('close', () => {
      this.readyState = 3;
    });
    Promise.resolve().then(() => this.emit('open'));
  }
}

Object.defineProperty(MockWS, 'OPEN', { value: 1 });
Object.defineProperty(MockWS, 'CLOSED', { value: 3 });

vi.mock('ws', () => ({ default: MockWS }));

const { BybitWebSocket } = await import('./bybit.ws');

describe('BybitWebSocket', () => {
  let ws: InstanceType<typeof BybitWebSocket>;
  let onConnected: ReturnType<typeof vi.fn>;
  let onDisconnected: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    wsInstances = [];
    onConnected = vi.fn();
    onDisconnected = vi.fn();
    onError = vi.fn();
    ws = new BybitWebSocket({ onConnected, onDisconnected, onError });
  });

  afterEach(() => {
    ws.disconnect();
    vi.useRealTimers();
  });

  function getLatestMockWs(): MockWS {
    return wsInstances[wsInstances.length - 1];
  }

  it('should connect and call onConnected', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    expect(onConnected).toHaveBeenCalledOnce();
    expect(ws.isConnected()).toBe(true);
  });

  it('should start ping interval on connect', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);

    const mockWs = getLatestMockWs();
    mockWs.send.mockClear();

    await vi.advanceTimersByTimeAsync(20000);
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ op: 'ping' }));
  });

  it('should subscribe to tickers', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);

    const callback = vi.fn();
    ws.subscribeTicker(['BTCUSDT', 'ETHUSDT'], callback);

    const mockWs = getLatestMockWs();
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ op: 'subscribe', args: ['tickers.BTCUSDT', 'tickers.ETHUSDT'] }),
    );
  });

  it('should normalize ticker data', async () => {
    const callback = vi.fn();
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    ws.subscribeTicker(['BTCUSDT'], callback);

    getLatestMockWs().emit(
      'message',
      Buffer.from(
        JSON.stringify({
          topic: 'tickers.BTCUSDT',
          data: {
            lastPrice: '50000',
            volume24h: '1000',
            prevPrice24h: '49500',
            price24hPcnt: '0.0101',
            highPrice24h: '51000',
            lowPrice24h: '49000',
            ts: 1735689600000,
          },
        }),
      ),
    );

    expect(callback).toHaveBeenCalledWith({
      exchange: 'bybit',
      symbol: 'BTCUSDT',
      price: '50000',
      volume24h: '1000',
      change24h: String(50000 - 49500),
      changePercent24h: String(0.0101 * 100),
      high24h: '51000',
      low24h: '49000',
      timestamp: 1735689600000,
    });
  });

  it('should ignore non-ticker messages', async () => {
    const callback = vi.fn();
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    ws.subscribeTicker(['BTCUSDT'], callback);

    getLatestMockWs().emit('message', Buffer.from(JSON.stringify({ op: 'pong' })));
    expect(callback).not.toHaveBeenCalled();
  });

  it('should auto-reconnect on close', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    const countBefore = wsInstances.length;

    getLatestMockWs().emit('close');
    expect(onDisconnected).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3001);
    expect(wsInstances.length).toBeGreaterThan(countBefore);
  });

  it('should call onError on error event', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);

    const error = new Error('connection lost');
    getLatestMockWs().emit('error', error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should disconnect and cleanup', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);

    ws.disconnect();
    expect(ws.isConnected()).toBe(false);
  });

  it('should not duplicate connections', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    const count = wsInstances.length;

    ws.connect();
    expect(wsInstances.length).toBe(count);
  });
});
