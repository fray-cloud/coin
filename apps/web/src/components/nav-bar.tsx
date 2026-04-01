'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  ShoppingCart,
  BrainCircuit,
  Workflow,
  PieChart,
  Activity,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Coins,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useUser, useLogout } from '@/hooks/use-user';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';

export function NavBar() {
  const { user } = useUser();
  const logout = useLogout();
  const t = useTranslations('nav');

  return (
    <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo — always visible */}
        <Link href="/markets" className="font-semibold text-lg flex items-center gap-1.5 shrink-0">
          <Coins size={22} />
          {t('brand')}
        </Link>

        {/* Desktop nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide mx-4">
          <Link
            href="/markets"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted whitespace-nowrap"
          >
            <BarChart3 size={15} />
            {t('markets')}
          </Link>
          {user && (
            <>
              <Link
                href="/orders"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted whitespace-nowrap"
              >
                <ShoppingCart size={15} />
                {t('orders')}
              </Link>
              <Link
                href="/strategies"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted whitespace-nowrap"
              >
                <BrainCircuit size={15} />
                {t('strategies')}
              </Link>
              <Link
                href="/flows"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted whitespace-nowrap"
              >
                <Workflow size={15} />
                {t('flows')}
              </Link>
              <Link
                href="/portfolio"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted whitespace-nowrap"
              >
                <PieChart size={15} />
                {t('portfolio')}
              </Link>
              <Link
                href="/activity"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted whitespace-nowrap"
              >
                <Activity size={15} />
                {t('activity')}
              </Link>
              <Link
                href="/settings"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted whitespace-nowrap"
              >
                <Settings size={15} />
                {t('settings')}
              </Link>
            </>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          <LanguageSwitcher />
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.nickname || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-1">
                <LogOut size={15} />
                <span className="hidden sm:inline">{t('logout')}</span>
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} gap-1`}
              >
                <LogIn size={15} />
                {t('login')}
              </Link>
              <Link href="/signup" className={`${buttonVariants({ size: 'sm' })} gap-1`}>
                <UserPlus size={15} />
                <span className="hidden sm:inline">{t('signup')}</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
