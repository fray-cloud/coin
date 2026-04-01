import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, IsObject } from 'class-validator';

export class UpdateFlowDto {
  @ApiPropertyOptional({ description: '플로우 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '플로우 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '플로우 정의 (노드 + 엣지)', type: Object })
  @IsOptional()
  @IsObject()
  definition?: {
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
