export interface SagaStep<TContext> {
  readonly name: string;
  execute(context: TContext): Promise<TContext>;
  compensate(context: TContext): Promise<void>;
}

export interface SagaRunnerOptions {
  sagaType: string;
  correlationId: string;
  userId: string;
  timeoutMs: number;
}
