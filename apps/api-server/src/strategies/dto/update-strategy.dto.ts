import { IsString, IsIn, IsOptional, IsObject, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStrategyDto {
  @ApiPropertyOptional({ description: '전략 이름', example: 'BTC RSI Oversold Strategy v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: '실행 모드',
    example: 'signal',
    enum: ['auto', 'signal'],
  })
  @IsOptional()
  @IsIn(['auto', 'signal'])
  mode?: string;

  @ApiPropertyOptional({
    description: '거래 모드 (모의 또는 실전)',
    example: 'real',
    enum: ['paper', 'real'],
  })
  @IsOptional()
  @IsIn(['paper', 'real'])
  tradingMode?: string;

  @ApiPropertyOptional({
    description: '실전 거래용 거래소 API 키 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  exchangeKeyId?: string;

  @ApiPropertyOptional({
    description: '전략별 설정 파라미터',
    example: { period: 14, overbought: 75, oversold: 25 },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '리스크 관리 설정',
    example: { stopLossPercent: 2, takeProfitPercent: 6, maxPositionSize: 0.05 },
  })
  @IsOptional()
  @IsObject()
  riskConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '전략 평가 간격 (초 단위, 최소 10)',
    example: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  intervalSeconds?: number;

  @ApiPropertyOptional({
    description: '분석용 캔들 간격',
    example: '1h',
    enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
  })
  @IsOptional()
  @IsIn(['1m', '5m', '15m', '1h', '4h', '1d'])
  candleInterval?: string;
}
