import { vi } from 'vitest';

export function createMockSocket() {
  return {
    on: vi.fn(),
    disconnect: vi.fn(),
  };
}
