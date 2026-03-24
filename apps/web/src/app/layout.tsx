import type { Metadata } from 'next';
import './globals.css';
import { NavBar } from '@/components/nav-bar';
import { AuthDebug } from '@/components/auth-debug';

export const metadata: Metadata = {
  title: 'Coin Trading Platform',
  description: 'Cryptocurrency monitoring and auto-trading platform',
};

function parseExpiresIn(value: string): number {
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 900;
  const num = parseInt(match[1]);
  switch (match[2]) {
    case 's':
      return num;
    case 'm':
      return num * 60;
    case 'h':
      return num * 3600;
    case 'd':
      return num * 86400;
    default:
      return 900;
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const accessTtl = parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN || '15m');

  return (
    <html lang="ko">
      <body>
        <NavBar />
        <main>{children}</main>
        <AuthDebug accessTtl={accessTtl} />
      </body>
    </html>
  );
}
