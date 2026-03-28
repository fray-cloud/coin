import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationSettingResponse {
  @ApiPropertyOptional({ description: '텔레그램 채팅 ID' })
  telegramChatId!: string | null;

  @ApiProperty({ description: '주문 알림 활성화' })
  notifyOrders!: boolean;

  @ApiProperty({ description: '시그널 알림 활성화' })
  notifySignals!: boolean;

  @ApiProperty({ description: '리스크 알림 활성화' })
  notifyRisks!: boolean;
}
