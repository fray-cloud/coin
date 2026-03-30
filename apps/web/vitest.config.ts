import { createVitestConfig } from '@coin/test-utils/vitest.base';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default createVitestConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.stories.{ts,tsx}', 'src/app/**/layout.tsx', 'src/app/**/page.tsx'],
    },
  },
});
