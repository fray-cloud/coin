'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  PieChart,
  Activity,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Coins,
  LayoutDashboard,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useUser, useLogout } from '@/hooks/use-user';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { BaseCurrencyToggle } from '@/components/base-currency-toggle';
import { isDemo } from '@/lib/demo';

const DEMO_HIDDEN_PATHS = ['/settings'];

export function NavBar() {
  const { user } = useUser();
  const logout = useLogout();
  const t = useTranslations('nav');

  const showAuthLinks = !isDemo && !user;
  const showUserMenu = !isDemo && user;
  // In demo mode, show nav links without requiring auth
  const showNavLinks = user || isDemo;

  return (
    <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo — always visible */}
        <Link
          href={isDemo ? '/demo' : '/markets'}
          className="font-semibold text-lg flex items-center gap-1.5 shrink-0"
        >
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
          {showNavLinks && (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted whitespace-nowrap"
              >
                <LayoutDashboard size={15} />
                대시보드
              </Link>
              <Link
                href="/llm-trade"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted whitespace-nowrap"
              >
                <BarChart3 size={15} />
                LLM Trade
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
              {!isDemo && (
                <Link
                  href="/settings"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted whitespace-nowrap"
                >
                  <Settings size={15} />
                  {t('settings')}
                </Link>
              )}
            </>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1.5 shrink-0">
          <BaseCurrencyToggle />
          <ThemeToggle />
          <LanguageSwitcher />
          {showUserMenu && (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.nickname || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-1">
                <LogOut size={15} />
                <span className="hidden sm:inline">{t('logout')}</span>
              </Button>
            </>
          )}
          {showAuthLinks && (
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
          {isDemo && (
            <span className="text-sm text-muted-foreground hidden sm:inline ml-1">Demo</span>
          )}
        </div>
      </div>
    </nav>
  );
}
