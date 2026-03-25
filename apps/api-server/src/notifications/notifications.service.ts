import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { NotificationEvent } from '@coin/kafka-contracts';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private notificationListeners: ((payload: NotificationPayload) => void)[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {
    this.kafka = new Kafka({
      clientId: 'api-notifications',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.consumer = this.kafka.consumer({
      groupId: 'api-server-notifications',
    });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: KAFKA_TOPICS.NOTIFICATION_SEND,
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const event: NotificationEvent = JSON.parse(message.value.toString());
          await this.handleNotification(event);
        } catch (err) {
          this.logger.error(`Failed to process notification: ${err}`);
        }
      },
    });

    this.logger.log('Notification consumer started');
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }

  onNotification(callback: (payload: NotificationPayload) => void) {
    this.notificationListeners.push(callback);
  }

  private async handleNotification(event: NotificationEvent) {
    const { userId, type, title, message } = event;

    // Check user notification preferences
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { userId },
    });

    const shouldNotify =
      !setting ||
      (type === 'order_filled' && setting.notifyOrders) ||
      (type === 'order_failed' && setting.notifyOrders) ||
      (type === 'strategy_signal' && setting.notifySignals) ||
      (type === 'risk_blocked' && setting.notifyRisks);

    if (!shouldNotify) return;

    // Telegram
    if (setting?.telegramChatId) {
      await this.telegram.sendNotification(setting.telegramChatId, title, message);
    }

    // WebSocket broadcast via listeners
    const payload: NotificationPayload = { userId, type, title, message };
    for (const listener of this.notificationListeners) {
      listener(payload);
    }

    this.logger.log(`Notification sent to ${userId}: ${type}`);
  }
}
