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
    // Simulate readyState transitioning, then emit open
    this.on('close', () => {
      this.readyState = 3;
    });
    Promise.resolve().then(() => this.emit('open'));
  }
}

Object.defineProperty(MockWS, 'OPEN', { value: 1 });
Object.defineProperty(MockWS, 'CLOSED', { value: 3 });

vi.mock('ws', () => ({ default: MockWS }));

const { UpbitWebSocket } = await import('./upbit.ws');

describe('UpbitWebSocket', () => {
  let ws: InstanceType<typeof UpbitWebSocket>;
  let onConnected: ReturnType<typeof vi.fn>;
  let onDisconnected: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    wsInstances = [];
    onConnected = vi.fn();
    onDisconnected = vi.fn();
    onError = vi.fn();
    ws = new UpbitWebSocket({ onConnected, onDisconnected, onError });
  });

  afterEach(() => {
    ws.disconnect();
    vi.useRealTimers();
  });

  function getLatestMockWs(): MockWS {
    return wsInstances[wsInstances.length - 1];
  }

  it('should connect and call onConnected handler', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    expect(onConnected).toHaveBeenCalledOnce();
  });

  it('should report isConnected correctly after connect', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    expect(ws.isConnected()).toBe(true);
  });

  it('should disconnect and cleanup', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    ws.disconnect();
    expect(ws.isConnected()).toBe(false);
  });

  it('should send subscription when subscribing after connect', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);

    const callback = vi.fn();
    ws.subscribeTicker(['KRW-BTC', 'KRW-ETH'], callback);

    const mockWs = getLatestMockWs();
    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('ticker'));
    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('KRW-BTC'));
  });

  it('should normalize ticker data from message', async () => {
    const callback = vi.fn();
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    ws.subscribeTicker(['KRW-BTC'], callback);

    getLatestMockWs().emit(
      'message',
      Buffer.from(
        JSON.stringify({
          type: 'ticker',
          code: 'KRW-BTC',
          trade_price: 50000000,
          acc_trade_volume_24h: 1000,
          signed_change_price: 500000,
          signed_change_rate: 0.01,
          high_price: 51000000,
          low_price: 49000000,
          timestamp: 1735689600000,
        }),
      ),
    );

    expect(callback).toHaveBeenCalledWith({
      exchange: 'upbit',
      symbol: 'KRW-BTC',
      price: '50000000',
      volume24h: '1000',
      change24h: '500000',
      changePercent24h: String(0.01 * 100),
      high24h: '51000000',
      low24h: '49000000',
      timestamp: 1735689600000,
    });
  });

  it('should auto-reconnect on close after 3 seconds', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    const countBefore = wsInstances.length;

    getLatestMockWs().emit('close');
    expect(onDisconnected).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3001);
    expect(wsInstances.length).toBeGreaterThan(countBefore);
  });

  it('should call onError handler on error', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);

    const error = new Error('connection failed');
    getLatestMockWs().emit('error', error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should not create duplicate connections', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    const count = wsInstances.length;

    ws.connect();
    expect(wsInstances.length).toBe(count);
  });
});
