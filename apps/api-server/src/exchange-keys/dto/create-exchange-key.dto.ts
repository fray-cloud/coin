import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExchangeKeyDto {
  @ApiProperty({
    description: '대상 거래소',
    example: 'binance',
    enum: ['upbit', 'binance', 'bybit'],
  })
  @IsIn(['upbit', 'binance', 'bybit'])
  exchange!: string;

  @ApiProperty({ description: '거래소 API 키', example: 'aB3dEfGhIjKlMnOpQrStUvWxYz012345' })
  @IsString()
  apiKey!: string;

  @ApiProperty({
    description: '거래소 API 시크릿 키',
    example: 'sEcReTkEy0123456789AbCdEfGhIjKl',
  })
  @IsString()
  secretKey!: string;
}
