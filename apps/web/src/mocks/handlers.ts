import { http, HttpResponse } from 'msw';
import { demoUser } from './data/demo-user';
import { demoOrders } from './data/orders';
import { demoStrategies, demoStrategyLogs, demoStrategyPerformance } from './data/strategies';
import { demoPortfolio } from './data/portfolio';
import { demoActivity } from './data/activity';
import { demoFlows } from './data/flows';

export const handlers = [
  // Auth
  http.get('/api/auth/me', () => HttpResponse.json(demoUser)),
  http.post('/api/auth/refresh', () => HttpResponse.json({ ok: true })),
  http.post('/api/auth/logout', () => HttpResponse.json({ ok: true })),

  // Orders
  http.get('/api/orders', () => HttpResponse.json({ items: demoOrders, nextCursor: null })),
  http.post('/api/orders', () => HttpResponse.json({ error: 'Demo mode' }, { status: 403 })),
  http.delete('/api/orders/:id', () => HttpResponse.json({ error: 'Demo mode' }, { status: 403 })),

  // Strategies
  http.get('/api/strategies', () => HttpResponse.json(demoStrategies)),
  http.get('/api/strategies/:id', ({ params }) => {
    const strategy = demoStrategies.find((s) => s.id === params.id);
    if (!strategy) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json(strategy);
  }),
  http.get('/api/strategies/:id/logs', () =>
    HttpResponse.json({ items: demoStrategyLogs, nextCursor: null }),
  ),
  http.get('/api/strategies/:id/performance', () => HttpResponse.json(demoStrategyPerformance)),
  http.get('/api/strategies/:id/signals', () => HttpResponse.json([])),
  http.post('/api/strategies', () => HttpResponse.json({ error: 'Demo mode' }, { status: 403 })),
  http.patch('/api/strategies/:id', () =>
    HttpResponse.json({ error: 'Demo mode' }, { status: 403 }),
  ),
  http.patch('/api/strategies/:id/toggle', () =>
    HttpResponse.json({ error: 'Demo mode' }, { status: 403 }),
  ),
  http.delete('/api/strategies/:id', () =>
    HttpResponse.json({ error: 'Demo mode' }, { status: 403 }),
  ),

  // Flows
  http.get('/api/flows', () => HttpResponse.json(demoFlows)),
  http.get('/api/flows/:id', ({ params }) => {
    const flow = demoFlows.find((f) => f.id === params.id);
    if (!flow) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json(flow);
  }),
  http.get('/api/flows/:flowId/backtests', ({ params }) => {
    const flow = demoFlows.find((f) => f.id === params.flowId);
    return HttpResponse.json(flow?.backtests ?? []);
  }),
  http.get('/api/flows/:flowId/backtests/:backtestId/trace', () =>
    HttpResponse.json({ items: [], total: 0 }),
  ),
  http.post('/api/flows', () => HttpResponse.json({ error: 'Demo mode' }, { status: 403 })),
  http.patch('/api/flows/:id', () => HttpResponse.json({ error: 'Demo mode' }, { status: 403 })),
  http.patch('/api/flows/:id/toggle', () =>
    HttpResponse.json({ error: 'Demo mode' }, { status: 403 }),
  ),
  http.delete('/api/flows/:id', () => HttpResponse.json({ error: 'Demo mode' }, { status: 403 })),
  http.post('/api/flows/:id/backtest', () =>
    HttpResponse.json({ error: 'Demo mode' }, { status: 403 }),
  ),

  // Portfolio
  http.get('/api/portfolio/summary', () => HttpResponse.json(demoPortfolio)),

  // Activity
  http.get('/api/activity', () => HttpResponse.json({ items: demoActivity, nextCursor: null })),

  // Markets - tickers (initial snapshot, WS handles live updates)
  http.get('/api/markets/tickers', () => HttpResponse.json([])),

  // Markets - candles (proxy to real exchange public APIs)
  http.get('/api/markets/candles/:exchange/:symbol', async ({ params, request }) => {
    const exchange = params.exchange as string;
    const symbol = decodeURIComponent(params.symbol as string);
    const url = new URL(request.url);
    const interval = url.searchParams.get('interval') || '5m';
    const limit = url.searchParams.get('limit') || '200';

    try {
      if (exchange === 'upbit') {
        const { fetchUpbitCandles } = await import('@/lib/demo-ws');
        const candles = await fetchUpbitCandles(symbol, interval, Number(limit));
        return HttpResponse.json(
          candles.map((c) => ({ ...c, exchange: 'upbit', symbol, interval })),
        );
      }
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
      notifySignals: true,
      notifyRisks: true,
    }),
  ),
];
