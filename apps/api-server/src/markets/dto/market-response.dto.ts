import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TickerResponse {
  @ApiProperty({ description: '거래소' })
  exchange!: string;

  @ApiProperty({ description: '심볼' })
  symbol!: string;

  @ApiProperty({ description: '가격' })
  price!: string;

  @ApiProperty({ description: '24시간 거래량' })
  volume24h!: string;

  @ApiProperty({ description: '24시간 변동' })
  change24h!: string;

  @ApiProperty({ description: '24시간 변동률 (%)' })
  changePercent24h!: string;

  @ApiProperty({ description: '24시간 최고가' })
  high24h!: string;

  @ApiProperty({ description: '24시간 최저가' })
  low24h!: string;

  @ApiProperty({ description: '타임스탬프' })
  timestamp!: number;
}

export class ExchangeRateResponse {
  @ApiProperty({ description: '1 USD = X KRW' })
  krwPerUsd!: number;

  @ApiPropertyOptional({ description: '소스' })
  source?: string;

  @ApiPropertyOptional({ description: '갱신 일시' })
  updatedAt!: string | null;
}

export class CandleResponse {
  @ApiProperty({ description: '거래소' })
  exchange!: string;

  @ApiProperty({ description: '심볼' })
  symbol!: string;

  @ApiProperty({ description: '간격' })
  interval!: string;

  @ApiProperty({ description: '시가' })
  open!: string;

  @ApiProperty({ description: '고가' })
  high!: string;

  @ApiProperty({ description: '저가' })
  low!: string;

  @ApiProperty({ description: '종가' })
  close!: string;

  @ApiProperty({ description: '거래량' })
  volume!: string;

  @ApiProperty({ description: '타임스탬프' })
  timestamp!: number;
}
