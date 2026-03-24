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
