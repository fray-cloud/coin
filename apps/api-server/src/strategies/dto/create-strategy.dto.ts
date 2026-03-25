import { IsString, IsIn, IsOptional, IsObject, IsInt, Min } from 'class-validator';

export class CreateStrategyDto {
  @IsString()
  name!: string;

  @IsIn(['rsi', 'macd', 'bollinger'])
  type!: string;

  @IsIn(['upbit', 'binance', 'bybit'])
  exchange!: string;

  @IsString()
  symbol!: string;

  @IsIn(['auto', 'signal'])
  mode!: string;

  @IsIn(['paper', 'real'])
  tradingMode!: string;

  @IsOptional()
  @IsString()
  exchangeKeyId?: string;

  @IsObject()
  config!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  riskConfig?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(10)
  intervalSeconds?: number;
}
