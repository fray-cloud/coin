import { IsString, IsIn, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteTradeDto {
  @ApiProperty({ description: 'USDT-M perpetual symbol', example: 'BTCUSDT' })
  @IsString()
  symbol!: string;

  @ApiProperty({ description: '포지션 방향', enum: ['long', 'short'] })
  @IsIn(['long', 'short'])
  side!: 'long' | 'short';

  @ApiProperty({ description: '베팅비용 (증거금, USDT)', example: 50 })
  @Type(() => Number)
  @Min(1)
  betUsdt!: number;

  @ApiProperty({ description: '레버리지 (1-20)', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  leverage!: number;

  @ApiProperty({ description: '익절 가격 (사용자가 LLM 응답에서 override 가능)', example: '67000' })
  @IsString()
  takeProfitPrice!: string;

  @ApiProperty({ description: '손절 가격', example: '63000' })
  @IsString()
  stopLossPrice!: string;

  @ApiProperty({
    description: '진입가 (LLM 응답 시점의 lastClose, 수량 계산에 사용)',
    example: '65000',
  })
  @IsString()
  entryPrice!: string;

  @ApiPropertyOptional({
    description: '거래소 키 ID (지정하지 않으면 testnet 키 우선)',
  })
  @IsOptional()
  @IsString()
  exchangeKeyId?: string;
}
