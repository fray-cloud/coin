import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const isDemo = process.env.NEXT_PUBLIC_DEMO === 'true';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  ...(isDemo ? {} : { output: 'standalone' }),
  transpilePackages: ['@coin/types'],
};

export default withNextIntl(nextConfig);
