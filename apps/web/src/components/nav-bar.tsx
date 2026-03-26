'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  ShoppingCart,
  BrainCircuit,
  PieChart,
  KeyRound,
  Bell,
  LogOut,
  LogIn,
  UserPlus,
  Coins,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useUser, useLogout } from '@/hooks/use-user';
import { LanguageSwitcher } from '@/components/language-switcher';

export function NavBar() {
  const { user } = useUser();
  const logout = useLogout();
  const t = useTranslations('nav');

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/markets" className="font-semibold text-lg flex items-center gap-1.5">
            <Coins size={22} />
            {t('brand')}
          </Link>
          <Link
            href="/markets"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <BarChart3 size={15} />
            {t('markets')}
          </Link>
          {user && (
            <>
              <Link
                href="/orders"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ShoppingCart size={15} />
                {t('orders')}
              </Link>
              <Link
                href="/strategies"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <BrainCircuit size={15} />
                {t('strategies')}
              </Link>
              <Link
                href="/portfolio"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <PieChart size={15} />
                {t('portfolio')}
              </Link>
              <Link
                href="/accounts"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <KeyRound size={15} />
                {t('accounts')}
              </Link>
              <Link
                href="/notifications"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Bell size={15} />
                {t('alerts')}
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.nickname || user.email}</span>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-1">
                <LogOut size={15} />
                {t('logout')}
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
                {t('signup')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
