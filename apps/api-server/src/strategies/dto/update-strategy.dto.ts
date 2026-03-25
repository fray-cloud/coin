import { IsString, IsIn, IsOptional, IsObject, IsInt, Min } from 'class-validator';

export class UpdateStrategyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['auto', 'signal'])
  mode?: string;

  @IsOptional()
  @IsIn(['paper', 'real'])
  tradingMode?: string;

  @IsOptional()
  @IsString()
  exchangeKeyId?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  riskConfig?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(10)
  intervalSeconds?: number;
}
