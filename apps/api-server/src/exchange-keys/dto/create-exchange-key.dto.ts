import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExchangeKeyDto {
  @ApiProperty({
    description: 'Target exchange',
    example: 'binance',
    enum: ['upbit', 'binance', 'bybit'],
  })
  @IsIn(['upbit', 'binance', 'bybit'])
  exchange!: string;

  @ApiProperty({ description: 'Exchange API key', example: 'aB3dEfGhIjKlMnOpQrStUvWxYz012345' })
  @IsString()
  apiKey!: string;

  @ApiProperty({
    description: 'Exchange API secret key',
    example: 'sEcReTkEy0123456789AbCdEfGhIjKl',
  })
  @IsString()
  secretKey!: string;
}
