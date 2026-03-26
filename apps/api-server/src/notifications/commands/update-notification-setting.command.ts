import { UpdateNotificationSettingDto } from '../dto/update-notification-setting.dto';

export class UpdateNotificationSettingCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: UpdateNotificationSettingDto,
  ) {}
}
