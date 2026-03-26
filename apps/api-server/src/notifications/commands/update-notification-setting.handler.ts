import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateNotificationSettingCommand } from './update-notification-setting.command';

@CommandHandler(UpdateNotificationSettingCommand)
export class UpdateNotificationSettingHandler implements ICommandHandler<UpdateNotificationSettingCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateNotificationSettingCommand) {
    const { userId, dto } = command;

    return this.prisma.notificationSetting.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });
  }
}
