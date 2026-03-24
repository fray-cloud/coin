import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coin Trading Platform',
  description: 'Cryptocurrency monitoring and auto-trading platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
