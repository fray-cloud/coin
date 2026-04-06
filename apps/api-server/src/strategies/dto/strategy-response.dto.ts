import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StrategyResponse {
  @ApiProperty({ description: '전략 ID' })
  id!: string;

  @ApiProperty({ description: '전략 이름' })
  name!: string;

  @ApiProperty({ description: '전략 유형 (rsi/macd/bollinger)' })
  type!: string;

  @ApiProperty({ description: '거래소' })
  exchange!: string;

  @ApiProperty({ description: '심볼' })
  symbol!: string;

  @ApiProperty({ description: '실행 모드 (auto/signal)' })
  mode!: string;

  @ApiProperty({ description: '거래 모드 (paper/real)' })
  tradingMode!: string;

  @ApiProperty({ description: '활성화 상태' })
  enabled!: boolean;

  @ApiProperty({ description: '전략 설정' })
  config!: object;

  @ApiProperty({ description: '리스크 설정' })
  riskConfig!: object;

  @ApiProperty({ description: '실행 간격 (초)' })
  intervalSeconds!: number;

  @ApiProperty({ description: '캔들 간격' })
  candleInterval!: string;

  @ApiProperty({ description: '표시 순서' })
  order!: number;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}

class DailyPnlItem {
  @ApiProperty({ description: '날짜', example: '2026-03-28' })
  date!: string;

  @ApiProperty({ description: '누적 손익' })
  pnl!: number;
}

export class StrategyPerformanceResponse {
  @ApiProperty({ description: '총 거래 수' })
  totalTrades!: number;

  @ApiProperty({ description: '매수 횟수' })
  buyTrades!: number;

  @ApiProperty({ description: '매도 횟수' })
  sellTrades!: number;

  @ApiProperty({ description: '수익 거래 수' })
  wins!: number;

  @ApiProperty({ description: '손실 거래 수' })
  losses!: number;

  @ApiProperty({ description: '승률 (%)' })
  winRate!: number;

  @ApiProperty({ description: '실현 손익' })
  realizedPnl!: number;

  @ApiProperty({ description: '일별 누적 P&L', type: [DailyPnlItem] })
  dailyPnl!: DailyPnlItem[];
}

export class StrategySignalResponse {
  @ApiProperty({ description: '시그널 (buy/sell)' })
  signal!: string;

  @ApiProperty({ description: '액션 유형' })
  action!: string;

  @ApiProperty({ description: '시그널 발생 가격' })
  price!: number;

  @ApiProperty({ description: '발생 일시' })
  createdAt!: string;
}

export class StrategyLogResponse {
  @ApiProperty({ description: '로그 ID' })
  id!: string;

  @ApiProperty({ description: '액션' })
  action!: string;

  @ApiPropertyOptional({ description: '시그널' })
  signal!: string | null;

  @ApiProperty({ description: '상세 정보' })
  details!: object;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;
}

export class StrategyLogListResponse {
  @ApiProperty({ description: '로그 목록', type: [StrategyLogResponse] })
  items!: StrategyLogResponse[];

  @ApiPropertyOptional({ description: '다음 페이지 커서' })
  nextCursor!: string | null;
}
