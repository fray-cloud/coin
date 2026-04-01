import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { BacktestCompletedEvent } from '@coin/kafka-contracts';
import { PrismaService } from '../prisma/prisma.service';

export interface BacktestCompletedPayload {
  backtestId: string;
  flowId: string;
  userId: string;
  status: 'completed' | 'failed';
  error?: string;
}

@Injectable()
export class FlowsKafkaConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FlowsKafkaConsumer.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private listeners: ((payload: BacktestCompletedPayload) => void)[] = [];

  constructor(private readonly prisma: PrismaService) {
    this.kafka = new Kafka({
      clientId: 'api-server-flows',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.consumer = this.kafka.consumer({ groupId: 'api-server-backtest' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: KAFKA_TOPICS.FLOW_BACKTEST_COMPLETED,
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: BacktestCompletedEvent = JSON.parse(message.value.toString());
        this.logger.log(`Backtest ${event.status}: ${event.backtestId} (flow: ${event.flowId})`);
        for (const listener of this.listeners) {
          listener({
            backtestId: event.backtestId,
            flowId: event.flowId,
            userId: event.userId,
            status: event.status,
            error: event.error,
          });
        }
      },
    });

    this.logger.log('Flows Kafka consumer started — listening for backtest completions');
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }

  onBacktestCompleted(listener: (payload: BacktestCompletedPayload) => void) {
    this.listeners.push(listener);
  }
}
