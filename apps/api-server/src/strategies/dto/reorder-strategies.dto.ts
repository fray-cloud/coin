import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class StrategyOrderItem {
  @ApiProperty({ description: '전략 ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: '새 순서 값 (0-based)' })
  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderStrategiesDto {
  @ApiProperty({ description: '순서 업데이트할 전략 목록', type: [StrategyOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyOrderItem)
  orders!: StrategyOrderItem[];
}
