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

  it('연결 후 onConnected 핸들러를 호출해야 한다', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    expect(onConnected).toHaveBeenCalledOnce();
  });

  it('연결 후 isConnected가 올바른 값을 반환해야 한다', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    expect(ws.isConnected()).toBe(true);
  });

  it('연결 해제 후 정리되어야 한다', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    ws.disconnect();
    expect(ws.isConnected()).toBe(false);
  });

  it('연결 후 구독 시 구독 메시지를 전송해야 한다', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);

    const callback = vi.fn();
    ws.subscribeTicker(['KRW-BTC', 'KRW-ETH'], callback);

    const mockWs = getLatestMockWs();
    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('ticker'));
    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('KRW-BTC'));
  });

  it('메시지에서 티커 데이터를 정규화해야 한다', async () => {
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

  it('연결 종료 후 3초 뒤 자동 재연결해야 한다', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    const countBefore = wsInstances.length;

    getLatestMockWs().emit('close');
    expect(onDisconnected).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3001);
    expect(wsInstances.length).toBeGreaterThan(countBefore);
  });

  it('에러 발생 시 onError 핸들러를 호출해야 한다', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);

    const error = new Error('connection failed');
    getLatestMockWs().emit('error', error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('중복 연결을 생성하지 않아야 한다', async () => {
    ws.connect();
    await vi.advanceTimersByTimeAsync(1);
    const count = wsInstances.length;

    ws.connect();
    expect(wsInstances.length).toBe(count);
  });
});
