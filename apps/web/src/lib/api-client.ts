import { isDemo } from '@/lib/demo';

const API_BASE = '/api';

const DEMO_BLOCKED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const DEMO_ALLOWED_PATHS = ['/auth/refresh', '/auth/logout'];

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
  // Demo mode: block mutations with a friendly error
  const method = (options.method || 'GET').toUpperCase();
  if (
    isDemo &&
    DEMO_BLOCKED_METHODS.includes(method) &&
    !DEMO_ALLOWED_PATHS.some((p) => path.startsWith(p))
  ) {
    throw new Error('데모에서는 사용할 수 없습니다');
  }

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
  network?: 'mainnet' | 'testnet';
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

export interface OrderDetail {
  order: OrderItem & {
    entryPrice: string | null;
    takeProfitPrice: string | null;
    stopLossPrice: string | null;
    realizedPnl: string | null;
    closedAt: string | null;
    leverage: number | null;
    positionSide: string | null;
  };
  decision: {
    id: string;
    parsedSignal: {
      signal: 'long' | 'short';
      takeProfitPrice: string;
      stopLossPrice: string;
      reasoning: string;
    };
    model: string;
    latencyMs: number;
    createdAt: string;
  } | null;
  network: 'testnet' | 'mainnet';
  markPrice: number | null;
  unrealizedPnl: number | null;
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const res = await apiFetch(`/orders/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to fetch order');
  }
  return res.json();
}

export async function closePosition(id: string): Promise<{ id: string; status: string }> {
  const res = await apiFetch(`/orders/${id}/close`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to close position');
  }
  return res.json();
}

// --- Notifications ---

export interface NotificationSettingItem {
  telegramChatId: string | null;
  notifyOrders: boolean;
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

export type PortfolioNetwork = 'testnet' | 'mainnet' | 'all';

export interface PortfolioAsset {
  exchange: string;
  currency: string;
  network: 'testnet' | 'mainnet';
  quantity: string;
  avgCost: number;
  currentPrice: number;
  valueKrw: number;
  pnl: number;
}

export interface NetworkBreakdown {
  totalValueKrw: number;
  realizedPnl: number;
  unrealizedPnl: number;
  dailyPnl: Array<{ date: string; pnl: number }>;
}

export interface PortfolioSummary {
  network: PortfolioNetwork;
  totalValueKrw: number;
  realizedPnl: number;
  unrealizedPnl: number;
  assets: PortfolioAsset[];
  dailyPnl: Array<{ date: string; pnl: number }>;
  byNetwork: { testnet: NetworkBreakdown; mainnet: NetworkBreakdown };
}

export async function getPortfolioSummary(network?: PortfolioNetwork): Promise<PortfolioSummary> {
  const params = network ? `?network=${network}` : '';
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

// Activity
export interface ActivityItem {
  id: string;
  type: 'order' | 'login';
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

// --- Claude Tokens ---

export interface ClaudeTokenStatus {
  registered: boolean;
  updatedAt?: string;
}

export async function getClaudeTokenStatus(): Promise<ClaudeTokenStatus> {
  const res = await apiFetch('/claude-tokens');
  if (!res.ok) throw new Error('Failed to fetch Claude token status');
  return res.json();
}

export async function saveClaudeToken(token: string): Promise<{ updatedAt: string }> {
  const res = await apiFetch('/claude-tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to save Claude token');
  }
  return res.json();
}

export async function deleteClaudeToken(): Promise<void> {
  const res = await apiFetch('/claude-tokens', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete Claude token');
}

// --- LLM Trades ---

export interface SignalResponse {
  signal: 'long' | 'short';
  takeProfitPrice: string;
  stopLossPrice: string;
  reasoning: string;
  entryPrice: string;
  latencyMs: number;
  model: string;
}

export async function requestSignal(input: {
  symbol: string;
  interval: string;
  candleCount: number;
}): Promise<SignalResponse> {
  const res = await apiFetch('/llm-trades/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to request signal');
  }
  return res.json();
}

export interface LlmDecisionItem {
  id: string;
  parsedSignal: {
    signal: 'long' | 'short';
    takeProfitPrice: string;
    stopLossPrice: string;
    reasoning: string;
  };
  model: string;
  latencyMs: number;
  createdAt: string;
  order: {
    id: string;
    status: string;
    symbol: string;
    side: string;
    entryPrice: string | null;
    takeProfitPrice: string | null;
    stopLossPrice: string | null;
    realizedPnl: string | null;
    closedAt: string | null;
    createdAt: string;
  } | null;
}

export interface DashboardSummary {
  pnl: {
    today: { testnet: number; mainnet: number };
    week: { testnet: number; mainnet: number };
  };
  openPositions: Array<
    OrderItem & {
      entryPrice: string | null;
      takeProfitPrice: string | null;
      stopLossPrice: string | null;
      leverage: number | null;
      markPrice: number | null;
      unrealizedPnl: number | null;
      exchangeKey: { network: 'testnet' | 'mainnet' } | null;
    }
  >;
  recentDecisions: LlmDecisionItem[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await apiFetch('/dashboard/summary');
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function executeTrade(input: {
  symbol: string;
  side: 'long' | 'short';
  betUsdt: number;
  leverage: number;
  takeProfitPrice: string;
  stopLossPrice: string;
  entryPrice: string;
  exchangeKeyId?: string;
}): Promise<{ id: string; status: string }> {
  const res = await apiFetch('/llm-trades/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to execute trade');
  }
  return res.json();
}
