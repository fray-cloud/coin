import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { BacktestRequestedEvent } from '@coin/kafka-contracts';

@Injectable()
export class FlowsKafkaProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FlowsKafkaProducer.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'api-server-flows',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Flows Kafka producer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async publishBacktestRequested(event: BacktestRequestedEvent) {
    await this.producer.send({
      topic: KAFKA_TOPICS.FLOW_BACKTEST_REQUESTED,
      messages: [
        {
          key: event.flowId,
          value: JSON.stringify(event),
        },
      ],
    });
    this.logger.log(`Published BacktestRequested for backtest ${event.backtestId}`);
  }
}
