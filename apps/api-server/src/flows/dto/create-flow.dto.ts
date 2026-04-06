import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';

export class CreateFlowDto {
  @ApiProperty({ description: '플로우 이름' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: '플로우 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '플로우 정의 (노드 + 엣지)', type: Object })
  @IsObject()
  definition!: {
    nodes: Array<{
      id: string;
      type: 'data' | 'indicator' | 'condition' | 'order' | 'flow-control';
      subtype: string;
      position: { x: number; y: number };
      config: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
    }>;
  };

  @ApiProperty({ enum: ['upbit', 'binance', 'bybit'], description: '거래소' })
  @IsIn(['upbit', 'binance', 'bybit'])
  exchange!: string;

  @ApiProperty({ description: '거래 심볼 (e.g., BTC/USDT)' })
  @IsString()
  symbol!: string;

  @ApiPropertyOptional({
    enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
    description: '캔들 간격',
  })
  @IsOptional()
  @IsIn(['1m', '5m', '15m', '1h', '4h', '1d'])
  candleInterval?: string;

  @ApiPropertyOptional({ enum: ['paper', 'real'], description: '트레이딩 모드' })
  @IsOptional()
  @IsIn(['paper', 'real'])
  tradingMode?: string;

  @ApiPropertyOptional({ description: '거래소 API 키 ID' })
  @IsOptional()
  @IsString()
  exchangeKeyId?: string;

  @ApiPropertyOptional({ description: '리스크 설정', type: Object })
  @IsOptional()
  @IsObject()
  riskConfig?: Record<string, unknown>;
}
