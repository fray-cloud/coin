import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExchangeKeyDto {
  @ApiProperty({
    description: '대상 거래소',
    example: 'binance',
    enum: ['binance'],
  })
  @IsIn(['binance'])
  exchange!: string;

  @ApiPropertyOptional({
    description: '네트워크 (mainnet | testnet)',
    example: 'testnet',
    enum: ['mainnet', 'testnet'],
  })
  @IsOptional()
  @IsIn(['mainnet', 'testnet'])
  network?: string;

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
