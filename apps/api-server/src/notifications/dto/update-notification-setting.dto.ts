import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationSettingDto {
  @ApiPropertyOptional({ description: 'Telegram chat ID for notifications', example: '123456789' })
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @ApiPropertyOptional({ description: 'Enable order execution notifications', example: true })
  @IsOptional()
  @IsBoolean()
  notifyOrders?: boolean;

  @ApiPropertyOptional({ description: 'Enable trading signal notifications', example: true })
  @IsOptional()
  @IsBoolean()
  notifySignals?: boolean;

  @ApiPropertyOptional({ description: 'Enable risk alert notifications', example: false })
  @IsOptional()
  @IsBoolean()
  notifyRisks?: boolean;
}
