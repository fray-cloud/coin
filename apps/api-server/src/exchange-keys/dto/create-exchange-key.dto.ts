import { IsString, IsIn } from 'class-validator';

export class CreateExchangeKeyDto {
  @IsIn(['upbit', 'binance', 'bybit'])
  exchange!: string;

  @IsString()
  apiKey!: string;

  @IsString()
  secretKey!: string;
}
