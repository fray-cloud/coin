import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RiskConfig {
  stopLossPercent?: number;
  dailyMaxLossUsd?: number;
  maxPositionSize?: string;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkRisk(
    userId: string,
    exchange: string,
    symbol: string,
    signal: 'buy' | 'sell',
    quantity: string,
    currentPrice: number,
    riskConfig: RiskConfig,
  ): Promise<RiskCheckResult> {
    // 1. Stop-loss check
    if (riskConfig.stopLossPercent && signal === 'buy') {
      const result = await this.checkStopLoss(
        userId,
        exchange,
        symbol,
        currentPrice,
        riskConfig.stopLossPercent,
      );
      if (!result.allowed) return result;
    }

    // 2. Daily max loss check
    if (riskConfig.dailyMaxLossUsd) {
      const result = await this.checkDailyMaxLoss(userId, riskConfig.dailyMaxLossUsd);
      if (!result.allowed) return result;
    }

    // 3. Max position size check
    if (riskConfig.maxPositionSize && signal === 'buy') {
      const result = await this.checkMaxPositionSize(
        userId,
        exchange,
        symbol,
        quantity,
        riskConfig.maxPositionSize,
      );
      if (!result.allowed) return result;
    }

    return { allowed: true };
  }

  private async checkStopLoss(
    userId: string,
    exchange: string,
    symbol: string,
    currentPrice: number,
    stopLossPercent: number,
  ): Promise<RiskCheckResult> {
    const lastBuy = await this.prisma.order.findFirst({
      where: {
        userId,
        exchange,
        symbol,
        side: 'buy',
        status: 'filled',
        filledPrice: { not: '0' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastBuy) return { allowed: true };

    const buyPrice = parseFloat(lastBuy.filledPrice);
    if (buyPrice === 0) return { allowed: true };

    const lossPercent = ((buyPrice - currentPrice) / buyPrice) * 100;
    if (lossPercent >= stopLossPercent) {
      return {
        allowed: false,
        reason: `Stop-loss triggered: loss ${lossPercent.toFixed(2)}% >= limit ${stopLossPercent}%`,
      };
    }

    return { allowed: true };
  }

  private async checkDailyMaxLoss(
    userId: string,
    dailyMaxLossUsd: number,
  ): Promise<RiskCheckResult> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = await this.prisma.order.findMany({
      where: {
        userId,
        status: 'filled',
        createdAt: { gte: todayStart },
      },
    });

    let dailyPnl = 0;
    for (const order of todayOrders) {
      const filled = parseFloat(order.filledPrice) * parseFloat(order.filledQuantity);
      const fee = parseFloat(order.fee);
      if (order.side === 'sell') {
        dailyPnl += filled - fee;
      } else {
        dailyPnl -= filled + fee;
      }
    }

    if (dailyPnl < 0 && Math.abs(dailyPnl) >= dailyMaxLossUsd) {
      return {
        allowed: false,
        reason: `Daily loss limit reached: $${Math.abs(dailyPnl).toFixed(2)} >= $${dailyMaxLossUsd}`,
      };
    }

    return { allowed: true };
  }

  private async checkMaxPositionSize(
    userId: string,
    exchange: string,
    symbol: string,
    newQuantity: string,
    maxPositionSize: string,
  ): Promise<RiskCheckResult> {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        exchange,
        symbol,
        status: 'filled',
      },
    });

    let netPosition = 0;
    for (const order of orders) {
      const qty = parseFloat(order.filledQuantity);
      if (order.side === 'buy') {
        netPosition += qty;
      } else {
        netPosition -= qty;
      }
    }

    const maxSize = parseFloat(maxPositionSize);
    const newTotal = netPosition + parseFloat(newQuantity);

    if (newTotal > maxSize) {
      return {
        allowed: false,
        reason: `Position size limit: ${newTotal.toFixed(6)} > max ${maxSize}`,
      };
    }

    return { allowed: true };
  }
}
