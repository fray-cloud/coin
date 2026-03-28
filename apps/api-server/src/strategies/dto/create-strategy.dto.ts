import { IsString, IsIn, IsOptional, IsObject, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStrategyDto {
  @ApiProperty({ description: '전략 이름', example: 'BTC RSI Oversold Strategy' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '전략 유형', example: 'rsi', enum: ['rsi', 'macd', 'bollinger'] })
  @IsIn(['rsi', 'macd', 'bollinger'])
  type!: string;

  @ApiProperty({
    description: '대상 거래소',
    example: 'binance',
    enum: ['upbit', 'binance', 'bybit'],
  })
  @IsIn(['upbit', 'binance', 'bybit'])
  exchange!: string;

  @ApiProperty({ description: '트레이딩 심볼', example: 'BTC/USDT' })
  @IsString()
  symbol!: string;

  @ApiProperty({ description: '실행 모드', example: 'auto', enum: ['auto', 'signal'] })
  @IsIn(['auto', 'signal'])
  mode!: string;

  @ApiProperty({
    description: '거래 모드 (모의 또는 실전)',
    example: 'paper',
    enum: ['paper', 'real'],
  })
  @IsIn(['paper', 'real'])
  tradingMode!: string;

  @ApiPropertyOptional({
    description: '실전 거래용 거래소 API 키 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  exchangeKeyId?: string;

  @ApiProperty({
    description: '전략별 설정 파라미터',
    example: { period: 14, overbought: 70, oversold: 30 },
  })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '리스크 관리 설정',
    example: { stopLossPercent: 3, takeProfitPercent: 5, maxPositionSize: 0.1 },
  })
  @IsOptional()
  @IsObject()
  riskConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '전략 평가 간격 (초 단위, 최소 10)',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  intervalSeconds?: number;

  @ApiPropertyOptional({
    description: '분석용 캔들 간격',
    example: '15m',
    enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
  })
  @IsOptional()
  @IsIn(['1m', '5m', '15m', '1h', '4h', '1d'])
  candleInterval?: string;
}
