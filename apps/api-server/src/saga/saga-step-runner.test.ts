import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SagaStepRunner } from './saga-step-runner';
import type { SagaStep } from './saga-step.interface';

const mockPrisma = {
  sagaExecution: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

interface TestContext {
  value: number;
}

function createStep(
  name: string,
  executeFn: (ctx: TestContext) => TestContext,
  compensateFn: (ctx: TestContext) => void = () => {},
): SagaStep<TestContext> {
  return {
    name,
    execute: vi.fn(async (ctx) => executeFn(ctx)),
    compensate: vi.fn(async (ctx) => compensateFn(ctx)),
  };
}

const defaultOptions = {
  sagaType: 'test',
  correlationId: 'corr-1',
  userId: 'user-1',
  timeoutMs: 60000,
};

describe('SagaStepRunner', () => {
  let runner: SagaStepRunner<TestContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.sagaExecution.findUnique.mockResolvedValue(null);
    mockPrisma.sagaExecution.create.mockResolvedValue({ id: 'saga-1' });
    mockPrisma.sagaExecution.update.mockResolvedValue({});
    runner = new SagaStepRunner<TestContext>(mockPrisma as never);
  });

  it('모든 스텝을 순서대로 실행해야 한다', async () => {
    const step1 = createStep('step1', (ctx) => ({ value: ctx.value + 1 }));
    const step2 = createStep('step2', (ctx) => ({ value: ctx.value * 2 }));

    runner.addStep(step1).addStep(step2);

    const result = await runner.run({ value: 1 }, defaultOptions);
    expect(result.value).toBe(4); // (1+1)*2
    expect(step1.execute).toHaveBeenCalled();
    expect(step2.execute).toHaveBeenCalled();
  });

  it('실패 시 역순으로 보상해야 한다', async () => {
    const compensateOrder: string[] = [];
    const step1 = createStep(
      'step1',
      (ctx) => ({ value: ctx.value + 1 }),
      () => compensateOrder.push('step1'),
    );
    const step2 = createStep(
      'step2',
      (ctx) => ({ value: ctx.value + 1 }),
      () => compensateOrder.push('step2'),
    );
    const step3 = createStep('step3', () => {
      throw new Error('step3 failed');
    });

    runner.addStep(step1).addStep(step2).addStep(step3);

    await expect(runner.run({ value: 0 }, defaultOptions)).rejects.toThrow('step3 failed');

    // Compensation should be in reverse: step2, step1
    expect(compensateOrder).toEqual(['step2', 'step1']);
  });

  it('성공 시 사가를 completed로 표시해야 한다', async () => {
    runner.addStep(createStep('step1', (ctx) => ctx));
    await runner.run({ value: 0 }, defaultOptions);

    const lastUpdate = mockPrisma.sagaExecution.update.mock.calls.at(-1)?.[0];
    expect(lastUpdate?.data.status).toBe('completed');
  });

  it('보상 후 사가를 failed로 표시해야 한다', async () => {
    runner.addStep(
      createStep('fail', () => {
        throw new Error('fail');
      }),
    );

    await expect(runner.run({ value: 0 }, defaultOptions)).rejects.toThrow();

    const failedUpdate = mockPrisma.sagaExecution.update.mock.calls.find(
      (call: unknown[]) => (call[0] as { data: { status: string } }).data.status === 'failed',
    );
    expect(failedUpdate).toBeDefined();
  });

  it('이미 완료된 사가이면 건너뛰어야 한다', async () => {
    mockPrisma.sagaExecution.findUnique.mockResolvedValue({
      status: 'completed',
      context: { value: 42 },
    });

    const step = createStep('step1', (ctx) => ctx);
    runner.addStep(step);

    const result = await runner.run({ value: 0 }, defaultOptions);
    expect(result.value).toBe(42);
    expect(step.execute).not.toHaveBeenCalled();
  });
});
