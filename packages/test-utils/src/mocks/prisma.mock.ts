import { vi } from 'vitest';

type MockPrismaModel = {
  findUnique: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  aggregate: ReturnType<typeof vi.fn>;
};

function createMockModel(): MockPrismaModel {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    aggregate: vi.fn(),
  };
}

export interface MockPrismaClient {
  user: MockPrismaModel;
  account: MockPrismaModel;
  refreshToken: MockPrismaModel;
  exchangeKey: MockPrismaModel;
  order: MockPrismaModel;
  strategy: MockPrismaModel;
  strategyLog: MockPrismaModel;
  notificationSetting: MockPrismaModel;
  sagaExecution: MockPrismaModel;
  loginHistory: MockPrismaModel;
  $transaction: ReturnType<typeof vi.fn>;
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
}

export function createMockPrismaClient(): MockPrismaClient {
  return {
    user: createMockModel(),
    account: createMockModel(),
    refreshToken: createMockModel(),
    exchangeKey: createMockModel(),
    order: createMockModel(),
    strategy: createMockModel(),
    strategyLog: createMockModel(),
    notificationSetting: createMockModel(),
    sagaExecution: createMockModel(),
    loginHistory: createMockModel(),
    $transaction: vi.fn((fn: (prisma: unknown) => unknown) => fn(this)),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
}
