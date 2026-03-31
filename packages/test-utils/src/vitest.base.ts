import { defineConfig, mergeConfig } from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createVitestConfig(overrides: Record<string, any> = {}) {
  return mergeConfig(
    defineConfig({
      test: {
        globals: true,
        passWithNoTests: true,
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json-summary', 'html'],
          thresholds: {
            lines: 70,
            branches: 70,
            functions: 70,
            statements: 70,
          },
        },
      },
    }),
    overrides,
  );
}
