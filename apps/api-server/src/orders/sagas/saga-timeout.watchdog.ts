import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { OrderLifecycleOrchestrator } from './order-lifecycle.orchestrator';

@Injectable()
export class SagaTimeoutWatchdog implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SagaTimeoutWatchdog.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly orchestrator: OrderLifecycleOrchestrator) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.orchestrator.handleTimeouts().catch((err) => {
        this.logger.error(`Timeout check failed: ${err}`);
      });
    }, 10_000);

    this.logger.log('Saga timeout watchdog started (10s interval)');
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
