import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateNotificationSettingDto {
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @IsOptional()
  @IsBoolean()
  notifyOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  notifySignals?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyRisks?: boolean;
}
