import type { Metadata } from 'next';
import './globals.css';
import { NavBar } from '@/components/nav-bar';
import { AuthDebug } from '@/components/auth-debug';

export const metadata: Metadata = {
  title: 'Coin Trading Platform',
  description: 'Cryptocurrency monitoring and auto-trading platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <NavBar />
        <main>{children}</main>
        <AuthDebug />
      </body>
    </html>
  );
}
