import { Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import { PrismaService } from '../../prisma/prisma.service';

export interface PositionUpdateContext {
  userId: string;
  orderId: string;
  exchange: string;
  symbol: string;
  side: string;
  filledQuantity: string;
  filledPrice: string;
  fee: string;
  feeCurrency: string;
  pnl?: number;
}

interface SagaStep {
  readonly name: string;
  execute(context: PositionUpdateContext): Promise<PositionUpdateContext>;
  compensate(context: PositionUpdateContext): Promise<void>;
}

export class CalcPnLStep implements SagaStep {
  readonly name = 'CalcPnL';
  private readonly logger = new Logger(CalcPnLStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: PositionUpdateContext): Promise<PositionUpdateContext> {
    const filledPrice = parseFloat(context.filledPrice);
    const filledQty = parseFloat(context.filledQuantity);
    const fee = parseFloat(context.fee);

    if (context.side === 'sell') {
      // Calculate P&L by comparing to avg buy price
      const buyOrders = await this.prisma.order.findMany({
        where: {
          userId: context.userId,
          exchange: context.exchange,
          symbol: context.symbol,
          side: 'buy',
          status: 'filled',
          filledPrice: { not: '0' },
        },
      });

      let totalCost = 0;
      let totalQty = 0;
      for (const o of buyOrders) {
        const q = parseFloat(o.filledQuantity);
        const p = parseFloat(o.filledPrice);
        if (q > 0 && p > 0) {
          totalCost += q * p;
          totalQty += q;
        }
      }

      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
      const pnl = avgCost > 0 ? (filledPrice - avgCost) * filledQty - fee : 0;

      this.logger.log(
        `PnL calculated for sell: avgCost=${avgCost.toFixed(4)}, pnl=${pnl.toFixed(4)}`,
      );
      return { ...context, pnl: Math.round(pnl * 100) / 100 };
    }

    // Buy orders have no realized P&L
    return { ...context, pnl: 0 };
  }

  async compensate(_context: PositionUpdateContext): Promise<void> {
    // noop — calculation only
  }
}

export class PublishPositionStep implements SagaStep {
  readonly name = 'PublishPosition';
  private readonly logger = new Logger(PublishPositionStep.name);

  constructor(private readonly producer: Producer) {}

  async execute(context: PositionUpdateContext): Promise<PositionUpdateContext> {
    const positionEvent = {
      userId: context.userId,
      orderId: context.orderId,
      exchange: context.exchange,
      symbol: context.symbol,
      side: context.side,
      filledQuantity: context.filledQuantity,
      filledPrice: context.filledPrice,
      fee: context.fee,
      feeCurrency: context.feeCurrency,
      pnl: context.pnl,
      timestamp: Date.now(),
    };

    await this.producer.send({
      topic: KAFKA_TOPICS.TRADING_POSITION_UPDATED,
      messages: [{ key: context.userId, value: JSON.stringify(positionEvent) }],
    });

    this.logger.log(`Position update published for order ${context.orderId}`);
    return context;
  }

  async compensate(_context: PositionUpdateContext): Promise<void> {
    // noop — message already sent
  }
}

export async function executePositionUpdateSaga(
  context: PositionUpdateContext,
  prisma: PrismaService,
  producer: Producer,
): Promise<void> {
  const logger = new Logger('PositionUpdateSaga');
  const steps: SagaStep[] = [new CalcPnLStep(prisma), new PublishPositionStep(producer)];

  let ctx = context;
  const completedSteps: SagaStep[] = [];

  for (const step of steps) {
    try {
      ctx = await step.execute(ctx);
      completedSteps.push(step);
    } catch (err) {
      logger.error(`Step "${step.name}" failed: ${err}`);
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        try {
          await completedSteps[i].compensate(ctx);
        } catch {}
      }
      throw err;
    }
  }
}
