import { ApiProperty } from '@nestjs/swagger';

export class PortfolioAssetResponse {
  @ApiProperty({ description: '거래소' })
  exchange!: string;

  @ApiProperty({ description: '통화' })
  currency!: string;

  @ApiProperty({ description: '수량' })
  quantity!: string;

  @ApiProperty({ description: '평균 매수 단가' })
  avgCost!: number;

  @ApiProperty({ description: '현재가' })
  currentPrice!: number;

  @ApiProperty({ description: '가치 (KRW)' })
  valueKrw!: number;

  @ApiProperty({ description: '손익' })
  pnl!: number;
}

class DailyPnlItem {
  @ApiProperty({ description: '날짜' })
  date!: string;

  @ApiProperty({ description: '누적 손익' })
  pnl!: number;
}

export class PortfolioSummaryResponse {
  @ApiProperty({ description: '총 자산 가치 (KRW)' })
  totalValueKrw!: number;

  @ApiProperty({ description: '실현 손익' })
  realizedPnl!: number;

  @ApiProperty({ description: '미실현 손익' })
  unrealizedPnl!: number;

  @ApiProperty({ description: '자산 목록', type: [PortfolioAssetResponse] })
  assets!: PortfolioAssetResponse[];

  @ApiProperty({ description: '일별 P&L', type: [DailyPnlItem] })
  dailyPnl!: DailyPnlItem[];

  @ApiProperty({ description: '모드', example: 'all' })
  mode!: string;
}
