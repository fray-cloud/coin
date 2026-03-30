import { createVitestConfig } from '@coin/test-utils/vitest.base';

export default createVitestConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
