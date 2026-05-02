import { http, HttpResponse } from 'msw';
import { demoUser } from './data/demo-user';
import { demoPortfolio } from './data/portfolio';
import { demoActivity } from './data/activity';

export const handlers = [
  // Auth
  http.get('/api/auth/me', () => HttpResponse.json(demoUser)),
  http.post('/api/auth/refresh', () => HttpResponse.json({ ok: true })),
  http.post('/api/auth/logout', () => HttpResponse.json({ ok: true })),

  // Portfolio
  http.get('/api/portfolio/summary', () => HttpResponse.json(demoPortfolio)),

  // Activity
  http.get('/api/activity', () => HttpResponse.json({ items: demoActivity, nextCursor: null })),

  // Markets - tickers (initial snapshot, WS handles live updates)
  http.get('/api/markets/tickers', () => HttpResponse.json([])),

  // Markets - candles (Binance public API only — Upbit/Bybit removed)
  http.get('/api/markets/candles/:exchange/:symbol', async ({ params, request }) => {
    const exchange = params.exchange as string;
    const symbol = decodeURIComponent(params.symbol as string);
    const url = new URL(request.url);
    const interval = url.searchParams.get('interval') || '5m';
    const limit = url.searchParams.get('limit') || '200';

    try {
      if (exchange === 'binance') {
        const { fetchBinanceCandles } = await import('@/lib/demo-ws');
        const candles = await fetchBinanceCandles(symbol, interval, Number(limit));
        return HttpResponse.json(
          candles.map((c) => ({ ...c, exchange: 'binance', symbol, interval })),
        );
      }
      return HttpResponse.json([]);
    } catch {
      return HttpResponse.json([]);
    }
  }),

  // Exchange rate
  http.get('/api/markets/exchange-rate', () =>
    HttpResponse.json({ krwPerUsd: 1430, source: 'demo', updatedAt: new Date().toISOString() }),
  ),

  // Exchange keys (empty in demo)
  http.get('/api/exchange-keys', () => HttpResponse.json([])),

  // Notifications
  http.get('/api/notifications/settings', () =>
    HttpResponse.json({
      telegramChatId: null,
      notifyOrders: true,
    }),
  ),
];
