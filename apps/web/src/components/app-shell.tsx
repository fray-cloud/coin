'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from '@/components/nav-bar';
import { MobileTabBar } from '@/components/mobile-tab-bar';
import { DemoBanner } from '@/components/demo-banner';
import { ToastContainer } from '@/components/toast';
import { isDemo } from '@/lib/demo';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDemoLanding = pathname === '/demo' || pathname.startsWith('/demo/');

  if (isDemoLanding) {
    return <>{children}</>;
  }

  return (
    <>
      {isDemo && <DemoBanner />}
      <NavBar />
      <main className="pb-16 md:pb-0">{children}</main>
      <MobileTabBar />
      <ToastContainer />
    </>
  );
}
