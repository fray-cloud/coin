import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
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

  @ApiProperty({ description: 'Order side', example: 'buy', enum: ['buy', 'sell'] })
  @IsIn(['buy', 'sell'])
  side!: string;

  @ApiProperty({ description: 'Order type', example: 'limit', enum: ['limit', 'market'] })
  @IsIn(['limit', 'market'])
  type!: string;

  @ApiProperty({ description: 'Order quantity', example: '0.001' })
  @IsString()
  quantity!: string;

  @ApiPropertyOptional({
    description: 'Limit price (required for limit orders)',
    example: '65000.00',
  })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiProperty({
    description: 'Trading mode (paper or real)',
    example: 'paper',
    enum: ['paper', 'real'],
  })
  @IsIn(['paper', 'real'])
  mode!: string;

  @ApiPropertyOptional({
    description: 'Exchange API key ID for real trading',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  exchangeKeyId?: string;
}
