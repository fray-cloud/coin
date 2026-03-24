import { IsString, IsIn, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsIn(['upbit', 'binance', 'bybit'])
  exchange!: string;

  @IsString()
  symbol!: string;

  @IsIn(['buy', 'sell'])
  side!: string;

  @IsIn(['limit', 'market'])
  type!: string;

  @IsString()
  quantity!: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsIn(['paper', 'real'])
  mode!: string;

  @IsOptional()
  @IsString()
  exchangeKeyId?: string;
}
