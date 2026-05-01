import { ApiProperty } from '@nestjs/swagger';

export class PortfolioAssetResponse {
  @ApiProperty({ description: '거래소' })
  exchange!: string;

  @ApiProperty({ description: '통화' })
  currency!: string;

  @ApiProperty({ description: '네트워크', enum: ['testnet', 'mainnet'] })
  network!: 'testnet' | 'mainnet';

  @ApiProperty({ description: '수량' })
  quantity!: string;

  @ApiProperty({ description: '평균 매수 단가' })
  avgCost!: number;

  @ApiProperty({ description: '현재가' })
  currentPrice!: number;

  @ApiProperty({ description: '가치 (USD/USDT, 견적 자산)' })
  valueUsd!: number;

  @ApiProperty({ description: '손익' })
  pnl!: number;
}

class DailyPnlItem {
  @ApiProperty({ description: '날짜' })
  date!: string;

  @ApiProperty({ description: '누적 손익' })
  pnl!: number;
}

class NetworkBreakdownResponse {
  @ApiProperty() totalValueUsd!: number;
  @ApiProperty() realizedPnl!: number;
  @ApiProperty() unrealizedPnl!: number;
  @ApiProperty({ type: [DailyPnlItem] }) dailyPnl!: DailyPnlItem[];
}

class PortfolioByNetworkResponse {
  @ApiProperty({ type: NetworkBreakdownResponse }) testnet!: NetworkBreakdownResponse;
  @ApiProperty({ type: NetworkBreakdownResponse }) mainnet!: NetworkBreakdownResponse;
}

export class PortfolioSummaryResponse {
  @ApiProperty({ description: '필터된 네트워크', enum: ['testnet', 'mainnet', 'all'] })
  network!: 'testnet' | 'mainnet' | 'all';

  @ApiProperty({ description: '총 자산 가치 (USD/USDT)' })
  totalValueUsd!: number;

  @ApiProperty({ description: '실현 손익' })
  realizedPnl!: number;

  @ApiProperty({ description: '미실현 손익' })
  unrealizedPnl!: number;

  @ApiProperty({ description: '자산 목록', type: [PortfolioAssetResponse] })
  assets!: PortfolioAssetResponse[];

  @ApiProperty({ description: '일별 누적 P&L', type: [DailyPnlItem] })
  dailyPnl!: DailyPnlItem[];

  @ApiProperty({ description: '네트워크별 분할', type: PortfolioByNetworkResponse })
  byNetwork!: PortfolioByNetworkResponse;
}
