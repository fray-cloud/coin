'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  ShoppingCart,
  BrainCircuit,
  PieChart,
  MoreHorizontal,
  KeyRound,
  Activity,
  Bell,
  Settings,
  X,
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';

const TABS = [
  { href: '/markets', icon: BarChart3, labelKey: 'markets' as const },
  { href: '/orders', icon: ShoppingCart, labelKey: 'orders' as const },
  { href: '/strategies', icon: BrainCircuit, labelKey: 'strategies' as const },
  { href: '/portfolio', icon: PieChart, labelKey: 'portfolio' as const },
];

const MORE_ITEMS = [
  { href: '/activity', icon: Activity, labelKey: 'activity' as const },
  { href: '/settings', icon: Settings, labelKey: 'settings' as const },
];

export function MobileTabBar() {
  const { user } = useUser();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [showMore, setShowMore] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-16 left-0 right-0 bg-card border-t border-border rounded-t-xl p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{t('more')}</span>
              <button type="button" onClick={() => setShowMore(false)}>
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            {MORE_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon size={18} />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border md:hidden">
        <div className="flex overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 min-w-[64px] flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                  active ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                <tab.icon size={20} />
                {t(tab.labelKey)}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className={`flex-1 min-w-[64px] flex flex-col items-center gap-0.5 py-2 text-[10px] ${
              showMore ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}
          >
            <MoreHorizontal size={20} />
            {t('more')}
          </button>
        </div>
      </nav>
    </>
  );
}
