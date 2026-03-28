import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationSettingDto {
  @ApiPropertyOptional({ description: '알림용 텔레그램 채팅 ID', example: '123456789' })
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @ApiPropertyOptional({ description: '주문 체결 알림 활성화', example: true })
  @IsOptional()
  @IsBoolean()
  notifyOrders?: boolean;

  @ApiPropertyOptional({ description: '트레이딩 시그널 알림 활성화', example: true })
  @IsOptional()
  @IsBoolean()
  notifySignals?: boolean;

  @ApiPropertyOptional({ description: '리스크 경고 알림 활성화', example: false })
  @IsOptional()
  @IsBoolean()
  notifyRisks?: boolean;
}
