import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@coin/test-utils/msw';
import { UpbitRest } from './upbit.rest';
import type { ExchangeCredentials } from '@coin/types';

const credentials: ExchangeCredentials = {
  apiKey: 'test-access-key',
  secretKey: 'test-secret-key',
};

const adapter = new UpbitRest();

describe('UpbitRest', () => {
  describe('잔고 조회 (getBalances)', () => {
    it('정규화된 잔고 목록을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/accounts', () => {
          return HttpResponse.json([
            { currency: 'KRW', balance: '1000000', locked: '50000' },
            { currency: 'BTC', balance: '0.5', locked: '0.1' },
          ]);
        }),
      );

      const balances = await adapter.getBalances(credentials);

      expect(balances).toHaveLength(2);
      expect(balances[0]).toEqual({
        exchange: 'upbit',
        currency: 'KRW',
        free: '1000000',
        locked: '50000',
      });
      expect(balances[1]).toEqual({
        exchange: 'upbit',
        currency: 'BTC',
        free: '0.5',
        locked: '0.1',
      });
    });

    it('잔고가 없으면 빈 배열을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/accounts', () => {
          return HttpResponse.json([]);
        }),
      );

      const balances = await adapter.getBalances(credentials);
      expect(balances).toEqual([]);
    });

    it('API 에러 시 예외를 던져야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/accounts', () => {
          return new HttpResponse('Unauthorized', { status: 401 });
        }),
      );

      await expect(adapter.getBalances(credentials)).rejects.toThrow('Upbit API error 401');
    });
  });

  describe('미체결 주문 조회 (getOpenOrders)', () => {
    it('매핑된 미체결 주문 목록을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/orders', () => {
          return HttpResponse.json([
            {
              uuid: 'order-1',
              side: 'bid',
              ord_type: 'limit',
              price: '50000000',
              state: 'wait',
              market: 'KRW-BTC',
              volume: '0.001',
              remaining_volume: '0.001',
              executed_volume: '0',
              trades_count: 0,
              created_at: '2025-01-01T00:00:00+09:00',
            },
          ]);
        }),
      );

      const orders = await adapter.getOpenOrders(credentials);

      expect(orders).toHaveLength(1);
      expect(orders[0].orderId).toBe('order-1');
      expect(orders[0].side).toBe('buy');
      expect(orders[0].status).toBe('placed');
      expect(orders[0].symbol).toBe('KRW-BTC');
    });
  });

  describe('주문 생성 (placeOrder)', () => {
    it('지정가 주문을 생성해야 한다', async () => {
      server.use(
        http.post('https://api.upbit.com/v1/orders', () => {
          return HttpResponse.json({
            uuid: 'new-order-1',
            side: 'bid',
            ord_type: 'limit',
            price: '50000000',
            state: 'wait',
            market: 'KRW-BTC',
            volume: '0.001',
            remaining_volume: '0.001',
            executed_volume: '0',
            trades_count: 0,
            created_at: '2025-01-01T00:00:00+09:00',
          });
        }),
      );

      const result = await adapter.placeOrder(credentials, {
        exchange: 'upbit',
        symbol: 'KRW-BTC',
        side: 'buy',
        type: 'limit',
        quantity: '0.001',
        price: '50000000',
      });

      expect(result.orderId).toBe('new-order-1');
      expect(result.type).toBe('limit');
      expect(result.status).toBe('placed');
    });

    it('시장가 매도 주문을 생성해야 한다', async () => {
      server.use(
        http.post('https://api.upbit.com/v1/orders', () => {
          return HttpResponse.json({
            uuid: 'market-sell-1',
            side: 'ask',
            ord_type: 'market',
            price: null,
            state: 'done',
            market: 'KRW-BTC',
            volume: '0.001',
            remaining_volume: '0',
            executed_volume: '0.001',
            executed_funds: '50000',
            trades_count: 1,
            paid_fee: '25',
            created_at: '2025-01-01T00:00:00+09:00',
          });
        }),
      );

      const result = await adapter.placeOrder(credentials, {
        exchange: 'upbit',
        symbol: 'KRW-BTC',
        side: 'sell',
        type: 'market',
        quantity: '0.001',
      });

      expect(result.orderId).toBe('market-sell-1');
      expect(result.type).toBe('market');
      expect(result.status).toBe('filled');
      expect(result.side).toBe('sell');
    });

    it('시장가 매수 주문을 생성해야 한다 (KRW 금액 기준)', async () => {
      server.use(
        http.post('https://api.upbit.com/v1/orders', () => {
          return HttpResponse.json({
            uuid: 'market-buy-1',
            side: 'bid',
            ord_type: 'price',
            price: '50000',
            state: 'cancel',
            market: 'KRW-BTC',
            volume: null,
            remaining_volume: null,
            executed_volume: '0.001',
            executed_funds: '50000',
            trades_count: 1,
            paid_fee: '25',
            created_at: '2025-01-01T00:00:00+09:00',
          });
        }),
      );

      const result = await adapter.placeOrder(credentials, {
        exchange: 'upbit',
        symbol: 'KRW-BTC',
        side: 'buy',
        type: 'market',
        quantity: '50000',
      });

      expect(result.orderId).toBe('market-buy-1');
      // Upbit market buy ends with 'cancel' state but has executed_volume > 0 → filled
      expect(result.status).toBe('filled');
    });

    it('API 에러 시 예외를 던져야 한다', async () => {
      server.use(
        http.post('https://api.upbit.com/v1/orders', () => {
          return new HttpResponse('Bad Request', { status: 400 });
        }),
      );

      await expect(
        adapter.placeOrder(credentials, {
          exchange: 'upbit',
          symbol: 'KRW-BTC',
          side: 'buy',
          type: 'market',
          quantity: '50000',
        }),
      ).rejects.toThrow('Upbit API error 400');
    });
  });

  describe('주문 취소 (cancelOrder)', () => {
    it('주문을 취소해야 한다', async () => {
      server.use(
        http.delete('https://api.upbit.com/v1/order', () => {
          return HttpResponse.json({
            uuid: 'order-to-cancel',
            side: 'bid',
            ord_type: 'limit',
            price: '50000000',
            state: 'cancel',
            market: 'KRW-BTC',
            volume: '0.001',
            remaining_volume: '0.001',
            executed_volume: '0',
            trades_count: 0,
            created_at: '2025-01-01T00:00:00+09:00',
          });
        }),
      );

      const result = await adapter.cancelOrder(credentials, 'order-to-cancel');
      expect(result.status).toBe('cancelled');
      expect(result.orderId).toBe('order-to-cancel');
    });
  });

  describe('주문 조회 (getOrder)', () => {
    it('단일 주문을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/order', () => {
          return HttpResponse.json({
            uuid: 'order-123',
            side: 'ask',
            ord_type: 'limit',
            price: '60000000',
            state: 'done',
            market: 'KRW-BTC',
            volume: '0.002',
            remaining_volume: '0',
            executed_volume: '0.002',
            executed_funds: '120000',
            trades_count: 1,
            paid_fee: '60',
            created_at: '2025-01-01T00:00:00+09:00',
          });
        }),
      );

      const result = await adapter.getOrder(credentials, 'order-123');
      expect(result.orderId).toBe('order-123');
      expect(result.status).toBe('filled');
      expect(result.side).toBe('sell');
      expect(result.filledPrice).toBe(String(120000 / 0.002));
    });
  });

  describe('마켓 목록 조회 (getMarkets)', () => {
    it('정규화된 마켓 목록을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/market/all', () => {
          return HttpResponse.json([
            { market: 'KRW-BTC', korean_name: '비트코인', english_name: 'Bitcoin' },
            { market: 'KRW-ETH', korean_name: '이더리움', english_name: 'Ethereum' },
          ]);
        }),
      );

      const markets = await adapter.getMarkets();

      expect(markets).toHaveLength(2);
      expect(markets[0]).toEqual({
        exchange: 'upbit',
        symbol: 'KRW-BTC',
        baseAsset: 'BTC',
        quoteAsset: 'KRW',
      });
    });

    it('API 에러 시 예외를 던져야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/market/all', () => {
          return new HttpResponse('Server Error', { status: 500 });
        }),
      );

      await expect(adapter.getMarkets()).rejects.toThrow('Upbit API error 500');
    });
  });

  describe('캔들 조회 (getCandles)', () => {
    it('시간순으로 정렬된 정규화된 캔들을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/candles/minutes/60', () => {
          return HttpResponse.json([
            {
              candle_date_time_utc: '2025-01-01T02:00:00',
              opening_price: 51000000,
              high_price: 52000000,
              low_price: 50500000,
              trade_price: 51500000,
              candle_acc_trade_volume: 200,
              timestamp: 1735693200000,
            },
            {
              candle_date_time_utc: '2025-01-01T01:00:00',
              opening_price: 50000000,
              high_price: 51000000,
              low_price: 49000000,
              trade_price: 50500000,
              candle_acc_trade_volume: 150,
              timestamp: 1735689600000,
            },
          ]);
        }),
      );

      const candles = await adapter.getCandles('KRW-BTC', '1h', 2);

      expect(candles).toHaveLength(2);
      // Reversed to chronological order (oldest first)
      expect(candles[0].timestamp).toBe(1735689600000);
      expect(candles[1].timestamp).toBe(1735693200000);
      expect(candles[0].exchange).toBe('upbit');
      expect(candles[0].open).toBe('50000000');
      expect(candles[0].close).toBe('50500000');
    });

    it('인터벌을 올바르게 매핑해야 한다', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      server.use(
        http.get('https://api.upbit.com/v1/candles/days', () => {
          return HttpResponse.json([]);
        }),
      );

      await adapter.getCandles('KRW-BTC', '1d', 10);

      const callUrl = fetchSpy.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('candles/days'),
      );
      expect(callUrl).toBeDefined();

      fetchSpy.mockRestore();
    });

    it('API 에러 시 예외를 던져야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/candles/*', () => {
          return new HttpResponse('Rate Limited', { status: 429 });
        }),
      );

      await expect(adapter.getCandles('KRW-BTC', '1h')).rejects.toThrow('Upbit API error 429');
    });
  });

  describe('주문 응답 매핑 엣지 케이스 (mapOrderResponse)', () => {
    it('executed_funds가 없을 때 체결 내역에서 체결가를 계산해야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/order', () => {
          return HttpResponse.json({
            uuid: 'order-trades',
            side: 'bid',
            ord_type: 'limit',
            price: '50000000',
            state: 'done',
            market: 'KRW-BTC',
            volume: '0.002',
            remaining_volume: '0',
            executed_volume: '0.002',
            trades_count: 2,
            created_at: '2025-01-01T00:00:00+09:00',
            trades: [
              {
                market: 'KRW-BTC',
                uuid: 't1',
                price: '50000000',
                volume: '0.001',
                funds: '50000',
                trend: 'up',
                side: 'bid',
                created_at: '2025-01-01',
              },
              {
                market: 'KRW-BTC',
                uuid: 't2',
                price: '50100000',
                volume: '0.001',
                funds: '50100',
                trend: 'up',
                side: 'bid',
                created_at: '2025-01-01',
              },
            ],
          });
        }),
      );

      const result = await adapter.getOrder(credentials, 'order-trades');
      // Average: (50000 + 50100) / (0.001 + 0.001) = 100100 / 0.002 = 50050000
      expect(result.filledPrice).toBe(String(100100 / 0.002));
    });

    it('"watch" 상태를 placed로 처리해야 한다', async () => {
      server.use(
        http.get('https://api.upbit.com/v1/order', () => {
          return HttpResponse.json({
            uuid: 'watch-order',
            side: 'bid',
            ord_type: 'limit',
            price: '50000000',
            state: 'watch',
            market: 'KRW-BTC',
            volume: '0.001',
            remaining_volume: '0.001',
            executed_volume: '0',
            trades_count: 0,
            created_at: '2025-01-01T00:00:00+09:00',
          });
        }),
      );

      const result = await adapter.getOrder(credentials, 'watch-order');
      expect(result.status).toBe('placed');
    });
  });
});
