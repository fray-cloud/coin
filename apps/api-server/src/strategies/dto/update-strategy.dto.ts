import { IsString, IsIn, IsOptional, IsObject, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStrategyDto {
  @ApiPropertyOptional({ description: 'Strategy name', example: 'BTC RSI Oversold Strategy v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Execution mode',
    example: 'signal',
    enum: ['auto', 'signal'],
  })
  @IsOptional()
  @IsIn(['auto', 'signal'])
  mode?: string;

  @ApiPropertyOptional({
    description: 'Trading mode (paper or real)',
    example: 'real',
    enum: ['paper', 'real'],
  })
  @IsOptional()
  @IsIn(['paper', 'real'])
  tradingMode?: string;

  @ApiPropertyOptional({
    description: 'Exchange API key ID for real trading',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  exchangeKeyId?: string;

  @ApiPropertyOptional({
    description: 'Strategy-specific configuration parameters',
    example: { period: 14, overbought: 75, oversold: 25 },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Risk management configuration',
    example: { stopLossPercent: 2, takeProfitPercent: 6, maxPositionSize: 0.05 },
  })
  @IsOptional()
  @IsObject()
  riskConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Strategy evaluation interval in seconds (min 10)',
    example: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  intervalSeconds?: number;

  @ApiPropertyOptional({
    description: 'Candle interval for analysis',
    example: '1h',
    enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
  })
  @IsOptional()
  @IsIn(['1m', '5m', '15m', '1h', '4h', '1d'])
  candleInterval?: string;
}
