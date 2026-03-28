import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderResponse {
  @ApiProperty({ description: '주문 ID' })
  id!: string;

  @ApiProperty({ description: '거래소' })
  exchange!: string;

  @ApiProperty({ description: '심볼' })
  symbol!: string;

  @ApiProperty({ description: '방향 (buy/sell)' })
  side!: string;

  @ApiProperty({ description: '유형 (market/limit)' })
  type!: string;

  @ApiProperty({ description: '모드 (paper/real)' })
  mode!: string;

  @ApiProperty({ description: '상태', example: 'filled' })
  status!: string;

  @ApiProperty({ description: '수량' })
  quantity!: string;

  @ApiPropertyOptional({ description: '지정가' })
  price!: string | null;

  @ApiProperty({ description: '체결 수량', example: '0.001' })
  filledQuantity!: string;

  @ApiProperty({ description: '체결 가격', example: '65000' })
  filledPrice!: string;

  @ApiProperty({ description: '수수료' })
  fee!: string;

  @ApiProperty({ description: '수수료 통화' })
  feeCurrency!: string;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}

export class OrderListResponse {
  @ApiProperty({ description: '주문 목록', type: [OrderResponse] })
  items!: OrderResponse[];

  @ApiPropertyOptional({ description: '다음 페이지 커서' })
  nextCursor!: string | null;
}
