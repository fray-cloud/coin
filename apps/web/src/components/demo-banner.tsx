'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-primary text-primary-foreground text-center text-xs py-1.5 px-4 flex items-center justify-center gap-2">
      <Info size={14} />
      <span>Demo Mode · Paper Trading Only</span>
      <Link href="/demo" className="underline underline-offset-2 hover:opacity-80">
        About
      </Link>
    </div>
  );
}
