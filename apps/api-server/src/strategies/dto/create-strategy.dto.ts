import { IsString, IsIn, IsOptional, IsObject, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStrategyDto {
  @ApiProperty({ description: 'Strategy name', example: 'BTC RSI Oversold Strategy' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Strategy type', example: 'rsi', enum: ['rsi', 'macd', 'bollinger'] })
  @IsIn(['rsi', 'macd', 'bollinger'])
  type!: string;

  @ApiProperty({
    description: 'Target exchange',
    example: 'binance',
    enum: ['upbit', 'binance', 'bybit'],
  })
  @IsIn(['upbit', 'binance', 'bybit'])
  exchange!: string;

  @ApiProperty({ description: 'Trading symbol', example: 'BTC/USDT' })
  @IsString()
  symbol!: string;

  @ApiProperty({ description: 'Execution mode', example: 'auto', enum: ['auto', 'signal'] })
  @IsIn(['auto', 'signal'])
  mode!: string;

  @ApiProperty({
    description: 'Trading mode (paper or real)',
    example: 'paper',
    enum: ['paper', 'real'],
  })
  @IsIn(['paper', 'real'])
  tradingMode!: string;

  @ApiPropertyOptional({
    description: 'Exchange API key ID for real trading',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  exchangeKeyId?: string;

  @ApiProperty({
    description: 'Strategy-specific configuration parameters',
    example: { period: 14, overbought: 70, oversold: 30 },
  })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Risk management configuration',
    example: { stopLossPercent: 3, takeProfitPercent: 5, maxPositionSize: 0.1 },
  })
  @IsOptional()
  @IsObject()
  riskConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Strategy evaluation interval in seconds (min 10)',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  intervalSeconds?: number;

  @ApiPropertyOptional({
    description: 'Candle interval for analysis',
    example: '15m',
    enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
  })
  @IsOptional()
  @IsIn(['1m', '5m', '15m', '1h', '4h', '1d'])
  candleInterval?: string;
}
