'use client';

import { isDemo } from '@/lib/demo';
import { type ReactNode, type ReactElement, cloneElement, isValidElement } from 'react';

interface DemoDisabledProps {
  children: ReactNode;
  message?: string;
}

export function DemoDisabled({
  children,
  message = '데모에서는 사용할 수 없습니다',
}: DemoDisabledProps) {
  if (!isDemo) return <>{children}</>;

  return (
    <div className="relative group">
      <div className="pointer-events-none opacity-50">{children}</div>
      <div className="absolute inset-0 cursor-not-allowed" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 rounded-md bg-popover border border-border text-xs text-popover-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md">
        {message}
      </div>
    </div>
  );
}

/** Utility: returns true if currently in demo mode */
export { isDemo };
