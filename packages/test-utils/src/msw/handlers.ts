import { http, HttpResponse } from 'msw';

export const upbitHandlers = [
  http.get('https://api.upbit.com/v1/market/all', () => {
    return HttpResponse.json([
      { market: 'KRW-BTC', korean_name: '비트코인', english_name: 'Bitcoin' },
      { market: 'KRW-ETH', korean_name: '이더리움', english_name: 'Ethereum' },
    ]);
  }),

  http.get('https://api.upbit.com/v1/candles/minutes/:unit', ({ request }) => {
    const url = new URL(request.url);
    const market = url.searchParams.get('market') || 'KRW-BTC';
    return HttpResponse.json([
      {
        market,
        candle_date_time_utc: '2025-01-01T00:00:00',
        opening_price: 50000000,
        high_price: 51000000,
        low_price: 49000000,
        trade_price: 50500000,
        candle_acc_trade_volume: 100.5,
        timestamp: Date.now(),
      },
    ]);
  }),

  http.get('https://api.upbit.com/v1/accounts', () => {
    return HttpResponse.json([
      { currency: 'KRW', balance: '1000000', locked: '0', avg_buy_price: '0' },
      { currency: 'BTC', balance: '0.5', locked: '0', avg_buy_price: '50000000' },
    ]);
  }),

  http.post('https://api.upbit.com/v1/orders', () => {
    return HttpResponse.json({
      uuid: 'test-order-uuid',
      side: 'bid',
      ord_type: 'price',
      state: 'wait',
      market: 'KRW-BTC',
      volume: null,
      price: '50000',
      executed_volume: '0',
      paid_fee: '0',
    });
  }),

  http.delete('https://api.upbit.com/v1/order', () => {
    return HttpResponse.json({
      uuid: 'test-order-uuid',
      state: 'cancel',
    });
  }),

  http.get('https://api.upbit.com/v1/order', () => {
    return HttpResponse.json({
      uuid: 'test-order-uuid',
      side: 'bid',
      state: 'done',
      market: 'KRW-BTC',
      volume: '0.001',
      executed_volume: '0.001',
      paid_fee: '25',
    });
  }),

  http.get('https://api.upbit.com/v1/orders/open', () => {
    return HttpResponse.json([]);
  }),
];

export const binanceHandlers = [
  http.get('https://api.binance.com/api/v3/exchangeInfo', () => {
    return HttpResponse.json({
      symbols: [
        {
          symbol: 'BTCUSDT',
          baseAsset: 'BTC',
          quoteAsset: 'USDT',
          status: 'TRADING',
        },
      ],
    });
  }),

  http.get('https://api.binance.com/api/v3/klines', () => {
    return HttpResponse.json([
      [
        Date.now(),
        '50000',
        '51000',
        '49000',
        '50500',
        '100.5',
        Date.now(),
        '5025000',
        150,
        '60.3',
        '3015000',
        '0',
      ],
    ]);
  }),

  http.get('https://api.binance.com/api/v3/account', () => {
    return HttpResponse.json({
      balances: [
        { asset: 'USDT', free: '10000', locked: '0' },
        { asset: 'BTC', free: '0.5', locked: '0' },
      ],
    });
  }),

  http.post('https://api.binance.com/api/v3/order', () => {
    return HttpResponse.json({
      orderId: 12345,
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      status: 'FILLED',
      executedQty: '0.001',
      cummulativeQuoteQty: '50',
    });
  }),

  http.delete('https://api.binance.com/api/v3/order', () => {
    return HttpResponse.json({
      orderId: 12345,
      status: 'CANCELED',
    });
  }),

  http.get('https://api.binance.com/api/v3/order', () => {
    return HttpResponse.json({
      orderId: 12345,
      symbol: 'BTCUSDT',
      status: 'FILLED',
      executedQty: '0.001',
    });
  }),

  http.get('https://api.binance.com/api/v3/openOrders', () => {
    return HttpResponse.json([]);
  }),
];

export const bybitHandlers = [
  http.get('https://api.bybit.com/v5/market/instruments-info', () => {
    return HttpResponse.json({
      retCode: 0,
      result: {
        list: [{ symbol: 'BTCUSDT', baseCoin: 'BTC', quoteCoin: 'USDT', status: 'Trading' }],
      },
    });
  }),

  http.get('https://api.bybit.com/v5/market/kline', () => {
    return HttpResponse.json({
      retCode: 0,
      result: {
        list: [[String(Date.now()), '50000', '51000', '49000', '50500', '100.5', '5025000']],
      },
    });
  }),

  http.get('https://api.bybit.com/v5/account/wallet-balance', () => {
    return HttpResponse.json({
      retCode: 0,
      result: {
        list: [
          {
            coin: [
              { coin: 'USDT', free: '10000', locked: '0' },
              { coin: 'BTC', free: '0.5', locked: '0' },
            ],
          },
        ],
      },
    });
  }),

  http.post('https://api.bybit.com/v5/order/create', () => {
    return HttpResponse.json({
      retCode: 0,
      result: { orderId: 'bybit-order-123', orderLinkId: '' },
    });
  }),

  http.post('https://api.bybit.com/v5/order/cancel', () => {
    return HttpResponse.json({
      retCode: 0,
      result: { orderId: 'bybit-order-123' },
    });
  }),

  http.get('https://api.bybit.com/v5/order/realtime', () => {
    return HttpResponse.json({
      retCode: 0,
      result: { list: [] },
    });
  }),
];

export const defaultHandlers = [...upbitHandlers, ...binanceHandlers, ...bybitHandlers];
