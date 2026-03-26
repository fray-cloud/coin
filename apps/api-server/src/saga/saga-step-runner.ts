import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SagaStep, SagaRunnerOptions } from './saga-step.interface';

export class SagaStepRunner<TContext> {
  private readonly logger = new Logger(SagaStepRunner.name);
  private steps: SagaStep<TContext>[] = [];

  constructor(private readonly prisma: PrismaService) {}

  addStep(step: SagaStep<TContext>): this {
    this.steps.push(step);
    return this;
  }

  async run(initialContext: TContext, options: SagaRunnerOptions): Promise<TContext> {
    // Idempotency: skip if already exists
    const existing = await this.prisma.sagaExecution.findUnique({
      where: { correlationId: options.correlationId },
    });
    if (existing) {
      if (existing.status === 'completed' || existing.status === 'running') {
        this.logger.warn(`Saga ${options.correlationId} already ${existing.status}, skipping`);
        return existing.context as TContext;
      }
    }

    const saga = await this.prisma.sagaExecution.create({
      data: {
        sagaType: options.sagaType,
        correlationId: options.correlationId,
        userId: options.userId,
        status: 'running',
        context: initialContext as any,
        completedSteps: [],
        expiresAt: new Date(Date.now() + options.timeoutMs),
      },
    });

    let context = initialContext;
    const completedStepNames: string[] = [];

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      try {
        context = await step.execute(context);
        completedStepNames.push(step.name);

        await this.prisma.sagaExecution.update({
          where: { id: saga.id },
          data: {
            currentStep: i + 1,
            context: context as any,
            completedSteps: completedStepNames,
          },
        });
      } catch (error) {
        this.logger.error(`Saga step "${step.name}" failed: ${error}`);

        await this.prisma.sagaExecution.update({
          where: { id: saga.id },
          data: { status: 'compensating', error: String(error) },
        });

        await this.compensate(context, completedStepNames, saga.id);
        throw error;
      }
    }

    await this.prisma.sagaExecution.update({
      where: { id: saga.id },
      data: {
        status: 'completed',
        context: context as any,
      },
    });

    return context;
  }

  private async compensate(
    context: TContext,
    completedStepNames: string[],
    sagaId: string,
  ): Promise<void> {
    for (let i = completedStepNames.length - 1; i >= 0; i--) {
      const stepName = completedStepNames[i];
      const step = this.steps.find((s) => s.name === stepName);
      if (!step) continue;

      try {
        await step.compensate(context);
        this.logger.log(`Compensated step "${stepName}"`);
      } catch (compError) {
        this.logger.error(`CRITICAL: Compensation for "${stepName}" failed: ${compError}`);
      }
    }

    await this.prisma.sagaExecution.update({
      where: { id: sagaId },
      data: { status: 'failed' },
    });
  }
}
