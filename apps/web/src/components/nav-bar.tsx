'use client';

import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { useUser, useLogout } from '@/hooks/use-user';

export function NavBar() {
  const { user } = useUser();
  const logout = useLogout();

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/markets" className="font-semibold text-lg">
            Coin
          </Link>
          <Link href="/markets" className="text-sm text-muted-foreground hover:text-foreground">
            Markets
          </Link>
          {user && (
            <>
              <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">
                Orders
              </Link>
              <Link
                href="/strategies"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Strategies
              </Link>
              <Link
                href="/accounts"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Accounts
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.nickname || user.email}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Login
              </Link>
              <Link href="/signup" className={buttonVariants({ size: 'sm' })}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
