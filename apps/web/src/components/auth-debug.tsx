'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';

function getCookieExpiry(name: string): number | null {
  // access_token is httpOnly, so we can't read it directly.
  // Instead we track it via the last login/refresh timestamp + known TTL.
  return null;
}

export function AuthDebug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loginTime, setLoginTime] = useState<number | null>(null);
  const ttl = 60; // matches dev JWT_ACCESS_EXPIRES_IN=1m

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 20));
  }, []);

  // Track login time from cookie presence
  useEffect(() => {
    // Check if logged in by calling /auth/me
    fetch('/api/auth/me', { credentials: 'same-origin' }).then((res) => {
      if (res.ok) {
        setLoginTime(Date.now());
        addLog('Session detected — tracking token expiry');
      }
    });
  }, [addLog]);

  // Listen for refresh events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      addLog('Token auto-refreshed!');
      setLoginTime(detail.timestamp);
    };
    window.addEventListener('auth:refresh', handler);
    return () => window.removeEventListener('auth:refresh', handler);
  }, [addLog]);

  // Countdown timer
  useEffect(() => {
    if (!loginTime) {
      setSecondsLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - loginTime) / 1000);
      const remaining = ttl - elapsed;
      setSecondsLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [loginTime]);

  // Test button: make an authenticated API call
  const testApiCall = async () => {
    addLog('Calling GET /auth/me via apiFetch...');
    const res = await apiFetch('/auth/me');
    if (res.ok) {
      const data = await res.json();
      addLog(`Response OK: ${data.email}`);
    } else {
      addLog(`Response ${res.status}`);
    }
  };

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-card border rounded-lg shadow-lg p-4 text-xs font-mono z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">Auth Debug</span>
        {secondsLeft !== null && (
          <span
            className={`px-2 py-0.5 rounded text-white ${
              secondsLeft > 10 ? 'bg-green-600' : secondsLeft > 0 ? 'bg-yellow-600' : 'bg-red-600'
            }`}
          >
            {secondsLeft > 0 ? `${secondsLeft}s` : 'EXPIRED'}
          </span>
        )}
      </div>
      <button
        onClick={testApiCall}
        className="w-full mb-2 px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90"
      >
        Test API Call (/auth/me)
      </button>
      <div className="max-h-40 overflow-y-auto space-y-0.5">
        {logs.length === 0 ? (
          <p className="text-muted-foreground">No events yet</p>
        ) : (
          logs.map((log, i) => (
            <p key={i} className={log.includes('auto-refreshed') ? 'text-green-600 font-bold' : ''}>
              {log}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
