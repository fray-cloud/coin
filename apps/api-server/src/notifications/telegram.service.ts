import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;

  async onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram notifications disabled');
      return;
    }

    this.bot = new Telegraf(token);

    this.bot.start((ctx) => {
      const chatId = ctx.chat.id;
      ctx.reply(
        `Chat ID: \`${chatId}\`\n\n` + `웹사이트의 알림 설정 페이지에서 이 ID를 입력하세요.`,
        { parse_mode: 'Markdown' },
      );
      this.logger.log(`Telegram /start from chat ${chatId}`);
    });

    this.bot.launch({ dropPendingUpdates: true });
    this.logger.log('Telegram bot started (polling mode)');
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('shutdown');
    }
  }

  async sendNotification(chatId: string, title: string, message: string): Promise<boolean> {
    if (!this.bot) return false;

    try {
      await this.bot.telegram.sendMessage(chatId, `*${title}*\n${message}`, {
        parse_mode: 'Markdown',
      });
      return true;
    } catch (err) {
      this.logger.error(`Telegram send failed to ${chatId}: ${err}`);
      return false;
    }
  }
}
