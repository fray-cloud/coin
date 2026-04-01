import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class BacktestRequestDto {
  @ApiProperty({ description: '백테스트 시작 날짜 (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: '백테스트 종료 날짜 (ISO 8601)' })
  @IsDateString()
  endDate!: string;
}
