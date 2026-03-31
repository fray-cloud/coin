const BASE_URL = (process.env.API_E2E_BASE_URL || 'https://localhost/api').replace(/\/$/, '');

export async function api(
  path: string,
  options: RequestInit & { cookies?: string } = {},
): Promise<Response> {
  const { cookies, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (fetchOptions.body) {
    headers['Content-Type'] ??= 'application/json';
  }
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  return fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    redirect: 'manual',
  });
}

export function extractCookies(res: Response): string {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  return setCookies.map((c) => c.split(';')[0]).join('; ');
}

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`;
}

export async function signupAndLogin(email?: string, password = 'TestPass123!'): Promise<string> {
  const e = email ?? uniqueEmail();
  const signupRes = await api('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: e, password }),
  });
  if (!signupRes.ok) {
    const body = await signupRes.text();
    throw new Error(`signupAndLogin failed (${signupRes.status}): ${body}`);
  }
  return extractCookies(signupRes);
}
