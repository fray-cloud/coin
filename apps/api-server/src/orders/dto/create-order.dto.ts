import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
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

  @ApiProperty({ description: '주문 방향', example: 'buy', enum: ['buy', 'sell'] })
  @IsIn(['buy', 'sell'])
  side!: string;

  @ApiProperty({ description: '주문 유형', example: 'limit', enum: ['limit', 'market'] })
  @IsIn(['limit', 'market'])
  type!: string;

  @ApiProperty({ description: '주문 수량', example: '0.001' })
  @IsString()
  quantity!: string;

  @ApiPropertyOptional({
    description: '지정가 (지정가 주문 시 필수)',
    example: '65000.00',
  })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiProperty({
    description: '거래 모드 (모의 또는 실전)',
    example: 'paper',
    enum: ['paper', 'real'],
  })
  @IsIn(['paper', 'real'])
  mode!: string;

  @ApiPropertyOptional({
    description: '실전 거래용 거래소 API 키 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  exchangeKeyId?: string;
}
