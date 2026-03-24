'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { getMe, logout } from '@/lib/api-client';

export function NavBar() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; nickname?: string } | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push('/login');
  };

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
              <Button variant="ghost" size="sm" onClick={handleLogout}>
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
