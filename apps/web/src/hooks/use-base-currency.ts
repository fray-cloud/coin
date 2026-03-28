'use client';

import { useState, useEffect, useCallback } from 'react';

export type BaseCurrency = 'KRW' | 'USD';

export function useBaseCurrency() {
  const [currency, setCurrencyState] = useState<BaseCurrency>('KRW');

  useEffect(() => {
    const stored = localStorage.getItem('baseCurrency') as BaseCurrency | null;
    if (stored === 'KRW' || stored === 'USD') {
      setCurrencyState(stored);
    }
  }, []);

  const setCurrency = useCallback((c: BaseCurrency) => {
    setCurrencyState(c);
    localStorage.setItem('baseCurrency', c);
  }, []);

  return { currency, setCurrency };
}
