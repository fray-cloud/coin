import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ExchangeId } from '@coin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { CancelOrderCommand } from './cancel-order.command';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
  private readonly logger = new Logger(CancelOrderHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CancelOrderCommand) {
    const { userId, orderId } = command;

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!['pending', 'placed'].includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order with status: ${order.status}`);
    }

    if (order.mode === 'real' && order.exchangeOrderId) {
      const { UpbitRest, BinanceRest, BybitRest } = await import('@coin/exchange-adapters');
      const { decrypt } = await import('@coin/utils');

      if (order.exchangeKeyId) {
        const key = await this.prisma.exchangeKey.findFirst({
          where: { id: order.exchangeKeyId, userId },
        });
        if (key) {
          const masterKey = process.env.ENCRYPTION_MASTER_KEY;
          if (masterKey) {
            const adapters = {
              upbit: UpbitRest,
              binance: BinanceRest,
              bybit: BybitRest,
            };
            const AdapterClass = adapters[order.exchange as ExchangeId];
            const adapter = new AdapterClass();
            const credentials = {
              apiKey: decrypt(key.apiKey, masterKey),
              secretKey: decrypt(key.secretKey, masterKey),
            };
            try {
              await adapter.cancelOrder(credentials, order.exchangeOrderId, order.symbol);
            } catch (err) {
              this.logger.warn(`Exchange cancel failed: ${err}`);
            }
          }
        }
      }
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    });

    return { id: orderId, status: 'cancelled' };
  }
}
