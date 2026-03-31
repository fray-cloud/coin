import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@coin/test-utils/msw';
import { BinanceRest } from './binance.rest';
import type { ExchangeCredentials } from '@coin/types';

const credentials: ExchangeCredentials = {
  apiKey: 'test-binance-key',
  secretKey: 'test-binance-secret',
};

const adapter = new BinanceRest();

describe('BinanceRest', () => {
  describe('잔고 조회 (getBalances)', () => {
    it('정규화된 잔고 목록을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/account', () => {
          return HttpResponse.json({
            balances: [
              { asset: 'USDT', free: '10000.50', locked: '500' },
              { asset: 'BTC', free: '0.5', locked: '0' },
            ],
          });
        }),
      );

      const balances = await adapter.getBalances(credentials);

      expect(balances).toHaveLength(2);
      expect(balances[0]).toEqual({
        exchange: 'binance',
        currency: 'USDT',
        free: '10000.50',
        locked: '500',
      });
    });

    it('API 에러 시 예외를 던져야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/account', () => {
          return new HttpResponse('Unauthorized', { status: 401 });
        }),
      );

      await expect(adapter.getBalances(credentials)).rejects.toThrow('Binance API error 401');
    });
  });

  describe('미체결 주문 조회 (getOpenOrders)', () => {
    it('미체결 주문 목록을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/openOrders', () => {
          return HttpResponse.json([
            {
              orderId: 12345,
              symbol: 'BTCUSDT',
              side: 'BUY',
              type: 'LIMIT',
              status: 'NEW',
              origQty: '0.001',
              executedQty: '0',
              price: '50000',
              time: 1735689600000,
            },
          ]);
        }),
      );

      const orders = await adapter.getOpenOrders(credentials);
      expect(orders).toHaveLength(1);
      expect(orders[0].orderId).toBe('12345');
      expect(orders[0].status).toBe('placed');
      expect(orders[0].side).toBe('buy');
    });

    it('미체결 주문이 없으면 빈 배열을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/openOrders', () => {
          return HttpResponse.json([]);
        }),
      );

      const orders = await adapter.getOpenOrders(credentials);
      expect(orders).toEqual([]);
    });
  });

  describe('주문 생성 (placeOrder)', () => {
    it('시장가 주문을 생성해야 한다', async () => {
      server.use(
        http.post('https://api.binance.com/api/v3/order', () => {
          return HttpResponse.json({
            orderId: 99999,
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            status: 'FILLED',
            origQty: '0.001',
            executedQty: '0.001',
            price: '0',
            transactTime: 1735689600000,
          });
        }),
      );

      const result = await adapter.placeOrder(credentials, {
        exchange: 'binance',
        symbol: 'BTCUSDT',
        side: 'buy',
        type: 'market',
        quantity: '0.001',
      });

      expect(result.orderId).toBe('99999');
      expect(result.status).toBe('filled');
      expect(result.type).toBe('market');
    });

    it('GTC 지정가 주문을 생성해야 한다', async () => {
      server.use(
        http.post('https://api.binance.com/api/v3/order', () => {
          return HttpResponse.json({
            orderId: 88888,
            symbol: 'BTCUSDT',
            side: 'SELL',
            type: 'LIMIT',
            status: 'NEW',
            origQty: '0.001',
            executedQty: '0',
            price: '60000',
            transactTime: 1735689600000,
          });
        }),
      );

      const result = await adapter.placeOrder(credentials, {
        exchange: 'binance',
        symbol: 'BTCUSDT',
        side: 'sell',
        type: 'limit',
        quantity: '0.001',
        price: '60000',
      });

      expect(result.orderId).toBe('88888');
      expect(result.status).toBe('placed');
      expect(result.type).toBe('limit');
    });

    it('API 에러 시 예외를 던져야 한다', async () => {
      server.use(
        http.post('https://api.binance.com/api/v3/order', () => {
          return new HttpResponse('Insufficient balance', { status: 400 });
        }),
      );

      await expect(
        adapter.placeOrder(credentials, {
          exchange: 'binance',
          symbol: 'BTCUSDT',
          side: 'buy',
          type: 'market',
          quantity: '100',
        }),
      ).rejects.toThrow('Binance API error 400');
    });
  });

  describe('주문 취소 (cancelOrder)', () => {
    it('주문을 취소해야 한다', async () => {
      server.use(
        http.delete('https://api.binance.com/api/v3/order', () => {
          return HttpResponse.json({
            orderId: 12345,
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'LIMIT',
            status: 'CANCELED',
            origQty: '0.001',
            executedQty: '0',
            price: '50000',
          });
        }),
      );

      const result = await adapter.cancelOrder(credentials, '12345', 'BTCUSDT');
      expect(result.status).toBe('cancelled');
    });
  });

  describe('주문 조회 (getOrder)', () => {
    it('체결 완료된 주문을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/order', () => {
          return HttpResponse.json({
            orderId: 12345,
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            status: 'FILLED',
            origQty: '0.001',
            executedQty: '0.001',
            price: '0',
            transactTime: 1735689600000,
          });
        }),
      );

      const result = await adapter.getOrder(credentials, '12345', 'BTCUSDT');
      expect(result.orderId).toBe('12345');
      expect(result.status).toBe('filled');
    });

    it('PARTIALLY_FILLED 상태를 올바르게 매핑해야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/order', () => {
          return HttpResponse.json({
            orderId: 12345,
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'LIMIT',
            status: 'PARTIALLY_FILLED',
            origQty: '1',
            executedQty: '0.5',
            price: '50000',
            transactTime: 1735689600000,
          });
        }),
      );

      const result = await adapter.getOrder(credentials, '12345', 'BTCUSDT');
      expect(result.status).toBe('partial');
    });

    it('REJECTED 상태를 failed로 매핑해야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/order', () => {
          return HttpResponse.json({
            orderId: 12345,
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            status: 'REJECTED',
            origQty: '0.001',
            executedQty: '0',
            price: '0',
          });
        }),
      );

      const result = await adapter.getOrder(credentials, '12345', 'BTCUSDT');
      expect(result.status).toBe('failed');
    });

    it('EXPIRED 상태를 cancelled로 매핑해야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/order', () => {
          return HttpResponse.json({
            orderId: 12345,
            symbol: 'BTCUSDT',
            side: 'SELL',
            type: 'LIMIT',
            status: 'EXPIRED',
            origQty: '0.001',
            executedQty: '0',
            price: '100000',
          });
        }),
      );

      const result = await adapter.getOrder(credentials, '12345', 'BTCUSDT');
      expect(result.status).toBe('cancelled');
    });
  });

  describe('마켓 목록 조회 (getMarkets)', () => {
    it('TRADING 상태의 마켓만 반환해야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/exchangeInfo', () => {
          return HttpResponse.json({
            symbols: [
              { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
              { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
              { symbol: 'OLDUSDT', baseAsset: 'OLD', quoteAsset: 'USDT', status: 'BREAK' },
            ],
          });
        }),
      );

      const markets = await adapter.getMarkets();

      expect(markets).toHaveLength(2);
      expect(markets[0]).toEqual({
        exchange: 'binance',
        symbol: 'BTCUSDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
      });
    });

    it('API 에러 시 예외를 던져야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/exchangeInfo', () => {
          return new HttpResponse('Server Error', { status: 500 });
        }),
      );

      await expect(adapter.getMarkets()).rejects.toThrow('Binance API error 500');
    });
  });

  describe('캔들 조회 (getCandles)', () => {
    it('정규화된 캔들을 반환해야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/klines', () => {
          return HttpResponse.json([
            [
              1735689600000,
              '50000',
              '51000',
              '49000',
              '50500',
              '100.5',
              1735693200000,
              '5025000',
              150,
              '60.3',
              '3015000',
              '0',
            ],
            [
              1735693200000,
              '50500',
              '52000',
              '50000',
              '51500',
              '200',
              1735696800000,
              '10200000',
              300,
              '120',
              '6120000',
              '0',
            ],
          ]);
        }),
      );

      const candles = await adapter.getCandles('BTCUSDT', '1h', 2);

      expect(candles).toHaveLength(2);
      expect(candles[0]).toEqual({
        exchange: 'binance',
        symbol: 'BTCUSDT',
        interval: '1h',
        open: '50000',
        high: '51000',
        low: '49000',
        close: '50500',
        volume: '100.5',
        timestamp: 1735689600000,
      });
    });

    it('API 에러 시 예외를 던져야 한다', async () => {
      server.use(
        http.get('https://api.binance.com/api/v3/klines', () => {
          return new HttpResponse('Rate Limited', { status: 429 });
        }),
      );

      await expect(adapter.getCandles('BTCUSDT', '1h')).rejects.toThrow('Binance API error 429');
    });
  });
});
