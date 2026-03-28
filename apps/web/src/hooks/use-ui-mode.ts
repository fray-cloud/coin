'use client';

import { useState, useEffect, useCallback } from 'react';

type UIMode = 'easy' | 'advanced';

export function useUIMode() {
  const [mode, setModeState] = useState<UIMode>('easy');

  useEffect(() => {
    const stored = localStorage.getItem('uiMode') as UIMode | null;
    if (stored === 'easy' || stored === 'advanced') {
      setModeState(stored);
    }
  }, []);

  const setMode = useCallback((m: UIMode) => {
    setModeState(m);
    localStorage.setItem('uiMode', m);
  }, []);

  return {
    mode,
    setMode,
    isEasy: mode === 'easy',
    isAdvanced: mode === 'advanced',
  };
}
