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

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await apiFetch('/portfolio/summary');
  if (!res.ok) throw new Error('Failed to fetch portfolio');
  return res.json();
}
