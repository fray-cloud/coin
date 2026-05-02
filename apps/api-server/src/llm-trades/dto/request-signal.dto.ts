import { IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const ALLOWED_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

export class RequestSignalDto {
  @ApiProperty({ description: 'USDT-M perpetual symbol', example: 'BTCUSDT' })
  @IsString()
  symbol!: string;

  @ApiProperty({
    description: '캔들 간격',
    enum: ALLOWED_INTERVALS,
    example: '5m',
  })
  @IsIn(ALLOWED_INTERVALS as unknown as string[])
  interval!: string;

  @ApiProperty({ description: '캔들 개수 (20-200)', example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(200)
  candleCount!: number;
}
