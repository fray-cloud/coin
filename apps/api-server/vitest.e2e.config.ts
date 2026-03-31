import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['e2e/**/*.e2e-test.ts'],
    setupFiles: ['./e2e/setup.ts'],
    testTimeout: 30_000,
    sequence: { concurrent: false },
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    reporters: process.env.CI ? ['verbose'] : ['default'],
  },
});
