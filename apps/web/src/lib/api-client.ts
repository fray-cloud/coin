const API_BASE = '/api';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'same-origin',
  })
    .then((res) => {
      if (res.ok && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:refresh', { detail: { timestamp: Date.now() } }),
        );
      }
      return res.ok;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });
  return refreshPromise;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { credentials: 'same-origin', ...options });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return fetch(url, { credentials: 'same-origin', ...options });
    }
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  return res;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Login failed');
  }
  return res.json();
}

export async function signup(email: string, password: string, nickname?: string) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password, nickname }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Signup failed');
  }
  return res.json();
}

export async function logout() {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'same-origin',
  });
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'same-origin' });
  if (!res.ok) return null;
  return res.json();
}

// --- Exchange Keys ---

export interface ExchangeKeyItem {
  id: string;
  exchange: string;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceItem {
  exchange: string;
  currency: string;
  free: string;
  locked: string;
}

export async function getExchangeKeys(): Promise<ExchangeKeyItem[]> {
  const res = await apiFetch('/exchange-keys');
  if (!res.ok) throw new Error('Failed to fetch exchange keys');
  return res.json();
}

export async function createExchangeKey(data: {
  exchange: string;
  apiKey: string;
  secretKey: string;
}): Promise<{ id: string; exchange: string }> {
  const res = await apiFetch('/exchange-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to register exchange key');
  }
  return res.json();
}

export async function deleteExchangeKey(id: string): Promise<void> {
  const res = await apiFetch(`/exchange-keys/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete exchange key');
}

export async function getBalances(keyId: string): Promise<BalanceItem[]> {
  const res = await apiFetch(`/exchange-keys/${keyId}/balances`);
  if (!res.ok) throw new Error('Failed to fetch balances');
  return res.json();
}

// --- Markets ---

export interface MarketItem {
  exchange: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

export async function getMarkets(keyId: string): Promise<MarketItem[]> {
  const res = await apiFetch(`/exchange-keys/${keyId}/markets`);
  if (!res.ok) throw new Error('Failed to fetch markets');
  return res.json();
}

export interface TickerItem {
  exchange: string;
  symbol: string;
  price: string;
  volume24h: string;
  change24h: string;
  changePercent24h: string;
  high24h: string;
  low24h: string;
  timestamp: number;
}

export async function getActiveTickers(): Promise<TickerItem[]> {
  const res = await apiFetch('/markets/tickers');
  if (!res.ok) throw new Error('Failed to fetch tickers');
  return res.json();
}

// --- Orders ---

export interface OrderItem {
  id: string;
  exchange: string;
  symbol: string;
  side: string;
  type: string;
  mode: string;
  status: string;
  quantity: string;
  price: string | null;
  filledQuantity: string;
  filledPrice: string;
  fee: string;
  feeCurrency: string;
  createdAt: string;
}

export interface OrdersResponse {
  items: OrderItem[];
  nextCursor: string | null;
}

export async function createOrder(data: {
  exchange: string;
  symbol: string;
  side: string;
  type: string;
  quantity: string;
  price?: string;
  mode: string;
  exchangeKeyId?: string;
}): Promise<{ id: string; status: string }> {
  const res = await apiFetch('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to create order');
  }
  return res.json();
}

export async function getOrders(cursor?: string, limit = 20): Promise<OrdersResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  const res = await apiFetch(`/orders?${params}`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function cancelOrder(id: string): Promise<{ id: string; status: string }> {
  const res = await apiFetch(`/orders/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to cancel order');
  }
  return res.json();
}

// --- Strategies ---

export interface StrategyItem {
  id: string;
  name: string;
  type: string;
  exchange: string;
  symbol: string;
  mode: string;
  tradingMode: string;
  enabled: boolean;
  config: Record<string, unknown>;
  riskConfig: Record<string, unknown>;
  intervalSeconds: number;
  candleInterval: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyLogItem {
  id: string;
  strategyId: string;
  action: string;
  signal: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface StrategyLogsResponse {
  items: StrategyLogItem[];
  nextCursor: string | null;
}

export interface StrategyPerformance {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  realizedPnl: number;
  dailyPnl: Array<{ date: string; pnl: number }>;
}

export async function getStrategyPerformance(id: string): Promise<StrategyPerformance> {
  const res = await apiFetch(`/strategies/${id}/performance`);
  if (!res.ok) throw new Error('Failed to fetch strategy performance');
  return res.json();
}

export interface CreateStrategyInput {
  name: string;
  type: string;
  exchange: string;
  symbol: string;
  mode: string;
  tradingMode: string;
  exchangeKeyId?: string;
  config: Record<string, unknown>;
  riskConfig?: Record<string, unknown>;
  intervalSeconds?: number;
  candleInterval?: string;
}

export async function getStrategies(): Promise<StrategyItem[]> {
  const res = await apiFetch('/strategies');
  if (!res.ok) throw new Error('Failed to fetch strategies');
  return res.json();
}

export async function getStrategy(id: string): Promise<StrategyItem> {
  const res = await apiFetch(`/strategies/${id}`);
  if (!res.ok) throw new Error('Failed to fetch strategy');
  return res.json();
}

export async function createStrategy(data: CreateStrategyInput): Promise<StrategyItem> {
  const res = await apiFetch('/strategies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to create strategy');
  }
  return res.json();
}

export async function updateStrategy(
  id: string,
  data: Partial<CreateStrategyInput>,
): Promise<StrategyItem> {
  const res = await apiFetch(`/strategies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to update strategy');
  }
  return res.json();
}

export async function toggleStrategy(id: string): Promise<{ id: string; enabled: boolean }> {
  const res = await apiFetch(`/strategies/${id}/toggle`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to toggle strategy');
  return res.json();
}

export async function deleteStrategy(id: string): Promise<void> {
  const res = await apiFetch(`/strategies/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete strategy');
}

export async function getStrategyLogs(
  id: string,
  cursor?: string,
  limit = 20,
): Promise<StrategyLogsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  const res = await apiFetch(`/strategies/${id}/logs?${params}`);
  if (!res.ok) throw new Error('Failed to fetch strategy logs');
  return res.json();
}

// Strategy signals (for chart markers)
export interface StrategySignal {
  signal: 'buy' | 'sell';
  action: string;
  price: number;
  createdAt: string;
}

export async function getStrategySignals(id: string): Promise<StrategySignal[]> {
  const res = await apiFetch(`/strategies/${id}/signals`);
  if (!res.ok) throw new Error('Failed to fetch strategy signals');
  return res.json();
}

// --- Notifications ---

export interface NotificationSettingItem {
  telegramChatId: string | null;
  notifyOrders: boolean;
  notifySignals: boolean;
  notifyRisks: boolean;
}

export async function getNotificationSettings(): Promise<NotificationSettingItem> {
  const res = await apiFetch('/notifications/settings');
  if (!res.ok) throw new Error('Failed to fetch notification settings');
  return res.json();
}

export async function updateNotificationSettings(
  data: Partial<NotificationSettingItem>,
): Promise<NotificationSettingItem> {
  const res = await apiFetch('/notifications/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update notification settings');
  return res.json();
}

// --- Portfolio ---

export interface PortfolioAsset {
  exchange: string;
  currency: string;
  quantity: string;
  avgCost: number;
  currentPrice: number;
  valueKrw: number;
  pnl: number;
}

export interface PortfolioSummary {
  totalValueKrw: number;
  realizedPnl: number;
  unrealizedPnl: number;
  assets: PortfolioAsset[];
  dailyPnl: Array<{ date: string; pnl: number }>;
}

export async function getPortfolioSummary(
  mode?: 'paper' | 'real' | 'all',
): Promise<PortfolioSummary> {
  const params = mode ? `?mode=${mode}` : '';
  const res = await apiFetch(`/portfolio/summary${params}`);
  if (!res.ok) throw new Error('Failed to fetch portfolio');
  return res.json();
}

// Exchange rate
export interface ExchangeRate {
  krwPerUsd: number;
  source?: string;
  updatedAt: string | null;
}

// Candles
export interface CandleData {
  exchange: string;
  symbol: string;
  interval: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  timestamp: number;
}

export async function getCandles(
  exchange: string,
  symbol: string,
  interval: string,
  limit = 200,
): Promise<CandleData[]> {
  const res = await apiFetch(
    `/markets/candles/${exchange}/${encodeURIComponent(symbol)}?interval=${interval}&limit=${limit}`,
  );
  if (!res.ok) throw new Error('Failed to fetch candles');
  return res.json();
}

export async function getExchangeRate(): Promise<ExchangeRate> {
  const res = await apiFetch('/markets/exchange-rate');
  if (!res.ok) throw new Error('Failed to fetch exchange rate');
  return res.json();
}

// --- Flows ---

import type { FlowDefinition, BacktestSummary } from '@coin/types';

export interface FlowItem {
  id: string;
  name: string;
  description: string | null;
  definition: FlowDefinition;
  exchange: string;
  symbol: string;
  candleInterval: string;
  enabled: boolean;
  tradingMode: string;
  riskConfig: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  backtests?: Array<{
    id: string;
    status: string;
    summary: BacktestSummary | null;
    createdAt: string;
  }>;
}

export interface BacktestItem {
  id: string;
  flowId: string;
  startDate: string;
  endDate: string;
  status: string;
  summary: BacktestSummary | null;
  createdAt: string;
}

export interface BacktestTraceItem {
  id: string;
  timestamp: string;
  nodeId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  fired: boolean;
  durationMs: number;
}

export interface BacktestTraceResponse {
  items: BacktestTraceItem[];
  total: number;
}

export async function getFlows(): Promise<FlowItem[]> {
  const res = await apiFetch('/flows');
  if (!res.ok) throw new Error('Failed to fetch flows');
  return res.json();
}

export async function getFlow(id: string): Promise<FlowItem> {
  const res = await apiFetch(`/flows/${id}`);
  if (!res.ok) throw new Error('Failed to fetch flow');
  return res.json();
}

export interface CreateFlowInput {
  name: string;
  description?: string;
  definition: FlowDefinition;
  exchange: string;
  symbol: string;
  candleInterval?: string;
  tradingMode?: string;
  exchangeKeyId?: string;
  riskConfig?: Record<string, unknown>;
}

export async function createFlow(data: CreateFlowInput): Promise<FlowItem> {
  const res = await apiFetch('/flows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to create flow');
  }
  return res.json();
}

export async function updateFlow(id: string, data: Partial<CreateFlowInput>): Promise<FlowItem> {
  const res = await apiFetch(`/flows/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to update flow');
  }
  return res.json();
}

export async function toggleFlow(id: string): Promise<{ id: string; enabled: boolean }> {
  const res = await apiFetch(`/flows/${id}/toggle`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to toggle flow');
  return res.json();
}

export async function deleteFlow(id: string): Promise<void> {
  const res = await apiFetch(`/flows/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete flow');
}

export async function requestBacktest(
  flowId: string,
  data: { startDate: string; endDate: string },
): Promise<{ backtestId: string }> {
  const res = await apiFetch(`/flows/${flowId}/backtest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to request backtest');
  }
  return res.json();
}

export async function getBacktests(flowId: string): Promise<BacktestItem[]> {
  const res = await apiFetch(`/flows/${flowId}/backtests`);
  if (!res.ok) throw new Error('Failed to fetch backtests');
  return res.json();
}

export async function getBacktestTrace(
  flowId: string,
  backtestId: string,
  params?: { from?: string; to?: string; limit?: number; offset?: number },
): Promise<BacktestTraceResponse> {
  const searchParams = new URLSearchParams();
  if (params?.from) searchParams.set('from', params.from);
  if (params?.to) searchParams.set('to', params.to);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  const qs = searchParams.toString();
  const res = await apiFetch(`/flows/${flowId}/backtests/${backtestId}/trace${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch backtest trace');
  return res.json();
}

// Activity
export interface ActivityItem {
  id: string;
  type: 'order' | 'strategy_signal' | 'strategy_order' | 'risk_blocked' | 'login';
  title: string;
  description: string;
  exchange?: string;
  symbol?: string;
  status?: string;
  side?: string;
  link?: string;
  createdAt: string;
}

export interface ActivityResponse {
  items: ActivityItem[];
  nextCursor: string | null;
}

export async function getActivity(cursor?: string): Promise<ActivityResponse> {
  const params = cursor ? `?cursor=${cursor}&limit=20` : '?limit=20';
  const res = await apiFetch(`/activity${params}`);
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}
