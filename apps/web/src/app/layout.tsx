import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { NavBar } from '@/components/nav-bar';
import { MobileTabBar } from '@/components/mobile-tab-bar';
import { AuthDebug } from '@/components/auth-debug';
import { ToastContainer } from '@/components/toast';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { Providers } from './providers';

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const accessTtl = parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN || '15m');
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <NavBar />
            <main className="pb-16 md:pb-0">{children}</main>
            <MobileTabBar />
            <ToastContainer />
            <OnboardingWizard />
            <AuthDebug accessTtl={accessTtl} />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
