import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityItemResponse {
  @ApiProperty({ description: '활동 ID' })
  id!: string;

  @ApiProperty({ description: '유형', example: 'order' })
  type!: string;

  @ApiProperty({ description: '제목' })
  title!: string;

  @ApiProperty({ description: '설명' })
  description!: string;

  @ApiPropertyOptional({ description: '거래소' })
  exchange?: string;

  @ApiPropertyOptional({ description: '심볼' })
  symbol?: string;

  @ApiPropertyOptional({ description: '상태' })
  status?: string;

  @ApiPropertyOptional({ description: '방향' })
  side?: string;

  @ApiPropertyOptional({ description: '링크' })
  link?: string;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;
}

export class ActivityListResponse {
  @ApiProperty({ description: '활동 목록', type: [ActivityItemResponse] })
  items!: ActivityItemResponse[];

  @ApiPropertyOptional({ description: '다음 페이지 커서' })
  nextCursor!: string | null;
}
