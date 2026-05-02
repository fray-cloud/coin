import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BinanceRest } from '@coin/exchange-adapters';
import type { ExchangeCredentials, OrderRequest, PositionSide } from '@coin/types';
import { decrypt } from '@coin/utils';

class FuturesTestDto {
  @IsString()
  exchangeKeyId!: string;

  @IsString()
  symbol!: string;

  @IsIn(['long', 'short'])
  side!: PositionSide;

  @IsString()
  quantity!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  leverage!: number;

  @IsOptional()
  @IsString()
  takeProfitPrice?: string;

  @IsOptional()
  @IsString()
  stopLossPrice?: string;
}

/**
 * Dev-only futures testnet smoke test endpoint. Bypasses the saga and calls
 * the Binance Futures adapter directly so the user can verify their testnet
 * key + adapter wiring without going through the full Kafka/saga path.
 *
 * Disabled in production via NODE_ENV check.
 */
@ApiTags('Debug')
@Public()
@Controller('debug')
export class DebugController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('futures-test')
  @ApiOperation({
    summary: '[DEV ONLY] Place a futures order directly on Binance via adapter',
  })
  async futuresTest(@Body() dto: FuturesTestDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Debug endpoint disabled in production');
    }

    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) throw new Error('ENCRYPTION_MASTER_KEY not configured');

    const exchangeKey = await this.prisma.exchangeKey.findUnique({
      where: { id: dto.exchangeKeyId },
    });
    if (!exchangeKey) throw new ForbiddenException('Exchange key not found');

    const credentials: ExchangeCredentials = {
      apiKey: decrypt(exchangeKey.apiKey, masterKey),
      secretKey: decrypt(exchangeKey.secretKey, masterKey),
      network: (exchangeKey.network as 'mainnet' | 'testnet') ?? 'mainnet',
    };

    const adapter = new BinanceRest();

    await adapter.setPositionMode(credentials, false);
    await adapter.setMarginType(credentials, dto.symbol, 'ISOLATED');
    await adapter.setLeverage(credentials, dto.symbol, dto.leverage);

    const order: OrderRequest = {
      exchange: 'binance',
      symbol: dto.symbol,
      side: dto.side,
      type: 'market',
      quantity: dto.quantity,
      leverage: dto.leverage,
      marginType: 'ISOLATED',
      takeProfitPrice: dto.takeProfitPrice,
      stopLossPrice: dto.stopLossPrice,
    };

    const entry = await adapter.placeOrder(credentials, order);

    let tp: { orderId: string } | undefined;
    let sl: { orderId: string } | undefined;
    if (dto.takeProfitPrice) {
      tp = await adapter.placeTakeProfit(credentials, dto.symbol, dto.side, dto.takeProfitPrice);
    }
    if (dto.stopLossPrice) {
      sl = await adapter.placeStopLoss(credentials, dto.symbol, dto.side, dto.stopLossPrice);
    }

    const position = await adapter.getPosition(credentials, dto.symbol);

    return {
      network: credentials.network,
      entry,
      tpOrderId: tp?.orderId,
      slOrderId: sl?.orderId,
      position,
    };
  }
}
