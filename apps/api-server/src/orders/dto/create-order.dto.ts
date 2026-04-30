import { IsString, IsIn, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    description: '대상 거래소',
    example: 'binance',
    enum: ['binance'],
  })
  @IsIn(['binance'])
  exchange!: string;

  @ApiProperty({ description: '트레이딩 심볼 (USDT-M perpetual)', example: 'BTCUSDT' })
  @IsString()
  symbol!: string;

  @ApiProperty({ description: '포지션 방향', example: 'long', enum: ['long', 'short'] })
  @IsIn(['long', 'short'])
  side!: string;

  @ApiProperty({ description: '주문 유형', example: 'market', enum: ['market', 'limit'] })
  @IsIn(['market', 'limit'])
  type!: string;

  @ApiProperty({ description: '주문 수량 (base asset)', example: '0.001' })
  @IsString()
  quantity!: string;

  @ApiPropertyOptional({ description: '지정가 (지정가 주문 시 필수)', example: '65000.00' })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiProperty({ description: '레버리지', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  leverage!: number;

  @ApiPropertyOptional({
    description: '마진 타입',
    example: 'ISOLATED',
    enum: ['ISOLATED', 'CROSS'],
  })
  @IsOptional()
  @IsIn(['ISOLATED', 'CROSS'])
  marginType?: string;

  @ApiPropertyOptional({ description: '익절 가격 (절대 USDT 가격)', example: '67000' })
  @IsOptional()
  @IsString()
  takeProfitPrice?: string;

  @ApiPropertyOptional({ description: '손절 가격 (절대 USDT 가격)', example: '63000' })
  @IsOptional()
  @IsString()
  stopLossPrice?: string;

  @ApiProperty({ description: '거래 모드', example: 'real', enum: ['real'] })
  @IsIn(['real'])
  mode!: string;

  @ApiProperty({
    description: '실거래용 거래소 API 키 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  exchangeKeyId!: string;
}
