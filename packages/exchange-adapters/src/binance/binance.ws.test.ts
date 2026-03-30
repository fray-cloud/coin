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

const { BinanceWebSocket } = await import('./binance.ws');

describe('BinanceWebSocket', () => {
  let ws: InstanceType<typeof BinanceWebSocket>;
  let onConnected: ReturnType<typeof vi.fn>;
  let onDisconnected: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    wsInstances = [];
    onConnected = vi.fn();
    onDisconnected = vi.fn();
    onError = vi.fn();
    ws = new BinanceWebSocket({ onConnected, onDisconnected, onError });
  });

  afterEach(() => {
    ws.disconnect();
    vi.useRealTimers();
  });

  function getLatestMockWs(): MockWS {
    return wsInstances[wsInstances.length - 1];
  }

  it('should not connect without symbols', () => {
    const before = wsInstances.length;
    ws.connect();
    expect(wsInstances.length).toBe(before);
  });

  it('should connect when subscribing to ticker', async () => {
    ws.subscribeTicker(['BTCUSDT'], vi.fn());
    await vi.advanceTimersByTimeAsync(1);

    expect(onConnected).toHaveBeenCalledOnce();
    expect(ws.isConnected()).toBe(true);
  });

  it('should reconnect with new URL when symbols change', async () => {
    ws.subscribeTicker(['BTCUSDT'], vi.fn());
    await vi.advanceTimersByTimeAsync(1);

    ws.subscribeTicker(['ETHUSDT', 'BNBUSDT'], vi.fn());
    await vi.advanceTimersByTimeAsync(1);

    expect(onConnected).toHaveBeenCalledTimes(2);
  });

  it('should normalize 24hrTicker message', async () => {
    const callback = vi.fn();
    ws.subscribeTicker(['BTCUSDT'], callback);
    await vi.advanceTimersByTimeAsync(1);

    getLatestMockWs().emit(
      'message',
      Buffer.from(
        JSON.stringify({
          e: '24hrTicker',
          s: 'BTCUSDT',
          c: '50000',
          v: '1000',
          p: '500',
          P: '1.01',
          h: '51000',
          l: '49000',
          E: 1735689600000,
        }),
      ),
    );

    expect(callback).toHaveBeenCalledWith({
      exchange: 'binance',
      symbol: 'BTCUSDT',
      price: '50000',
      volume24h: '1000',
      change24h: '500',
      changePercent24h: '1.01',
      high24h: '51000',
      low24h: '49000',
      timestamp: 1735689600000,
    });
  });

  it('should ignore non-ticker messages', async () => {
    const callback = vi.fn();
    ws.subscribeTicker(['BTCUSDT'], callback);
    await vi.advanceTimersByTimeAsync(1);

    getLatestMockWs().emit('message', Buffer.from(JSON.stringify({ e: 'trade', s: 'BTCUSDT' })));
    expect(callback).not.toHaveBeenCalled();
  });

  it('should auto-reconnect on close', async () => {
    ws.subscribeTicker(['BTCUSDT'], vi.fn());
    await vi.advanceTimersByTimeAsync(1);
    const countBefore = wsInstances.length;

    getLatestMockWs().emit('close');
    expect(onDisconnected).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3001);
    expect(wsInstances.length).toBeGreaterThan(countBefore);
  });

  it('should call onError on error event', async () => {
    ws.subscribeTicker(['BTCUSDT'], vi.fn());
    await vi.advanceTimersByTimeAsync(1);

    const error = new Error('ws error');
    getLatestMockWs().emit('error', error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should disconnect and cleanup', async () => {
    ws.subscribeTicker(['BTCUSDT'], vi.fn());
    await vi.advanceTimersByTimeAsync(1);

    ws.disconnect();
    expect(ws.isConnected()).toBe(false);
  });
});
