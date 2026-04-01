import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FlowResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  definition!: object;

  @ApiProperty()
  exchange!: string;

  @ApiProperty()
  symbol!: string;

  @ApiProperty()
  candleInterval!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  tradingMode!: string;

  @ApiPropertyOptional()
  riskConfig!: object | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BacktestResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  flowId!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  summary!: object | null;

  @ApiProperty()
  createdAt!: string;
}

export class BacktestTraceResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  nodeId!: string;

  @ApiProperty()
  input!: object;

  @ApiProperty()
  output!: object;

  @ApiProperty()
  fired!: boolean;

  @ApiProperty()
  durationMs!: number;
}

export class BacktestTraceListResponse {
  @ApiProperty({ type: [BacktestTraceResponse] })
  items!: BacktestTraceResponse[];

  @ApiProperty()
  total!: number;
}
