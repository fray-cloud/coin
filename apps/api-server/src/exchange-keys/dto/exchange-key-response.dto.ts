import { ApiProperty } from '@nestjs/swagger';

export class ExchangeKeyResponse {
  @ApiProperty({ description: 'API 키 ID' })
  id!: string;

  @ApiProperty({ description: '거래소' })
  exchange!: string;

  @ApiProperty({ description: '등록일시' })
  createdAt!: string;
}
