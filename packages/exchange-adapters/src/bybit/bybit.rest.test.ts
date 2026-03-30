import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@coin/test-utils/msw';
import { BybitRest } from './bybit.rest';
import type { ExchangeCredentials } from '@coin/types';

const credentials: ExchangeCredentials = {
  apiKey: 'test-bybit-key',
  secretKey: 'test-bybit-secret',
};

const adapter = new BybitRest();

function bybitOk(result: unknown) {
  return HttpResponse.json({ retCode: 0, retMsg: 'OK', result });
}

describe('BybitRest', () => {
  describe('getBalances', () => {
    it('should return normalized balances', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/account/wallet-balance', () => {
          return bybitOk({
            list: [
              {
                coin: [
                  { coin: 'USDT', availableToWithdraw: '10000', locked: '500' },
                  { coin: 'BTC', availableToWithdraw: '0.5', locked: '0' },
                ],
              },
            ],
          });
        }),
      );

      const balances = await adapter.getBalances(credentials);

      expect(balances).toHaveLength(2);
      expect(balances[0]).toEqual({
        exchange: 'bybit',
        currency: 'USDT',
        free: '10000',
        locked: '500',
      });
    });

    it('should return empty array when no wallet data', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/account/wallet-balance', () => {
          return bybitOk({ list: [] });
        }),
      );

      const balances = await adapter.getBalances(credentials);
      expect(balances).toEqual([]);
    });

    it('should throw on API error', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/account/wallet-balance', () => {
          return new HttpResponse('Unauthorized', { status: 401 });
        }),
      );

      await expect(adapter.getBalances(credentials)).rejects.toThrow('Bybit API error 401');
    });

    it('should throw on retCode !== 0', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/account/wallet-balance', () => {
          return HttpResponse.json({ retCode: 10001, retMsg: 'Invalid API key' });
        }),
      );

      await expect(adapter.getBalances(credentials)).rejects.toThrow(
        'Bybit API error: Invalid API key',
      );
    });
  });

  describe('getOpenOrders', () => {
    it('should return open orders', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/order/realtime', () => {
          return bybitOk({
            list: [
              {
                orderId: 'bybit-order-1',
                symbol: 'BTCUSDT',
                side: 'Buy',
                orderType: 'Limit',
                orderStatus: 'New',
                qty: '0.001',
                cumExecQty: '0',
                price: '50000',
                avgPrice: '0',
                cumExecFee: '0',
                createdTime: '1735689600000',
              },
            ],
          });
        }),
      );

      const orders = await adapter.getOpenOrders(credentials);
      expect(orders).toHaveLength(1);
      expect(orders[0].orderId).toBe('bybit-order-1');
      expect(orders[0].side).toBe('buy');
      expect(orders[0].type).toBe('limit');
    });

    it('should return empty array when no orders', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/order/realtime', () => {
          return bybitOk({ list: [] });
        }),
      );

      const orders = await adapter.getOpenOrders(credentials);
      expect(orders).toEqual([]);
    });
  });

  describe('placeOrder', () => {
    it('should place a market order', async () => {
      server.use(
        http.post('https://api.bybit.com/v5/order/create', () => {
          return bybitOk({ orderId: 'new-bybit-order' });
        }),
      );

      const result = await adapter.placeOrder(credentials, {
        exchange: 'bybit',
        symbol: 'BTCUSDT',
        side: 'buy',
        type: 'market',
        quantity: '0.001',
      });

      expect(result.orderId).toBe('new-bybit-order');
      expect(result.status).toBe('placed');
      expect(result.side).toBe('buy');
      expect(result.type).toBe('market');
    });

    it('should place a limit order with price and GTC', async () => {
      server.use(
        http.post('https://api.bybit.com/v5/order/create', () => {
          return bybitOk({ orderId: 'limit-order' });
        }),
      );

      const result = await adapter.placeOrder(credentials, {
        exchange: 'bybit',
        symbol: 'BTCUSDT',
        side: 'sell',
        type: 'limit',
        quantity: '0.001',
        price: '60000',
      });

      expect(result.orderId).toBe('limit-order');
      expect(result.type).toBe('limit');
      expect(result.price).toBe('60000');
    });

    it('should throw on API error', async () => {
      server.use(
        http.post('https://api.bybit.com/v5/order/create', () => {
          return new HttpResponse('Bad Request', { status: 400 });
        }),
      );

      await expect(
        adapter.placeOrder(credentials, {
          exchange: 'bybit',
          symbol: 'BTCUSDT',
          side: 'buy',
          type: 'market',
          quantity: '100',
        }),
      ).rejects.toThrow('Bybit API error 400');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      server.use(
        http.post('https://api.bybit.com/v5/order/cancel', () => {
          return bybitOk({ orderId: 'cancelled-order' });
        }),
      );

      const result = await adapter.cancelOrder(credentials, 'cancelled-order', 'BTCUSDT');
      expect(result.orderId).toBe('cancelled-order');
      expect(result.status).toBe('cancelled');
    });
  });

  describe('getOrder', () => {
    it('should return a single order', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/order/realtime', () => {
          return bybitOk({
            list: [
              {
                orderId: 'bybit-order-123',
                symbol: 'BTCUSDT',
                side: 'Sell',
                orderType: 'Market',
                orderStatus: 'Filled',
                qty: '0.002',
                cumExecQty: '0.002',
                price: '0',
                avgPrice: '50500',
                cumExecFee: '0.025',
                createdTime: '1735689600000',
              },
            ],
          });
        }),
      );

      const result = await adapter.getOrder(credentials, 'bybit-order-123');
      expect(result.orderId).toBe('bybit-order-123');
      expect(result.side).toBe('sell');
      expect(result.type).toBe('market');
      expect(result.filledPrice).toBe('50500');
    });

    it('should throw when order not found', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/order/realtime', () => {
          return bybitOk({ list: [] });
        }),
      );

      await expect(adapter.getOrder(credentials, 'nonexistent')).rejects.toThrow(
        'Order not found: nonexistent',
      );
    });
  });

  describe('getMarkets', () => {
    it('should return only Trading markets', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/market/instruments-info', () => {
          return HttpResponse.json({
            retCode: 0,
            retMsg: 'OK',
            result: {
              list: [
                { symbol: 'BTCUSDT', baseCoin: 'BTC', quoteCoin: 'USDT', status: 'Trading' },
                { symbol: 'ETHUSDT', baseCoin: 'ETH', quoteCoin: 'USDT', status: 'Trading' },
                { symbol: 'OLDUSDT', baseCoin: 'OLD', quoteCoin: 'USDT', status: 'Closed' },
              ],
            },
          });
        }),
      );

      const markets = await adapter.getMarkets();

      expect(markets).toHaveLength(2);
      expect(markets[0]).toEqual({
        exchange: 'bybit',
        symbol: 'BTCUSDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
      });
    });

    it('should throw on retCode !== 0', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/market/instruments-info', () => {
          return HttpResponse.json({ retCode: 10001, retMsg: 'Service unavailable', result: {} });
        }),
      );

      await expect(adapter.getMarkets()).rejects.toThrow('Bybit API error: Service unavailable');
    });

    it('should throw on HTTP error', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/market/instruments-info', () => {
          return new HttpResponse('Server Error', { status: 500 });
        }),
      );

      await expect(adapter.getMarkets()).rejects.toThrow('Bybit API error 500');
    });
  });

  describe('getCandles', () => {
    it('should return candles in chronological order', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/market/kline', () => {
          return HttpResponse.json({
            retCode: 0,
            retMsg: 'OK',
            result: {
              list: [
                ['1735693200000', '50500', '52000', '50000', '51500', '200', '10200000'],
                ['1735689600000', '50000', '51000', '49000', '50500', '100.5', '5025000'],
              ],
            },
          });
        }),
      );

      const candles = await adapter.getCandles('BTCUSDT', '1h', 2);

      expect(candles).toHaveLength(2);
      // Reversed to chronological order (oldest first)
      expect(candles[0].timestamp).toBe(1735689600000);
      expect(candles[1].timestamp).toBe(1735693200000);
      expect(candles[0]).toEqual({
        exchange: 'bybit',
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

    it('should throw on retCode !== 0', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/market/kline', () => {
          return HttpResponse.json({ retCode: 10001, retMsg: 'Invalid symbol', result: {} });
        }),
      );

      await expect(adapter.getCandles('INVALID', '1h')).rejects.toThrow(
        'Bybit API error: Invalid symbol',
      );
    });

    it('should throw on HTTP error', async () => {
      server.use(
        http.get('https://api.bybit.com/v5/market/kline', () => {
          return new HttpResponse('Rate Limited', { status: 429 });
        }),
      );

      await expect(adapter.getCandles('BTCUSDT', '1h')).rejects.toThrow('Bybit API error 429');
    });
  });
});
