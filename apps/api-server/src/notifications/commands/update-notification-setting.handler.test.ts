import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateNotificationSettingHandler } from './update-notification-setting.handler';
import { UpdateNotificationSettingCommand } from './update-notification-setting.command';

const mockPrisma = {
  notificationSetting: { upsert: vi.fn() },
};

describe('UpdateNotificationSettingHandler', () => {
  let handler: UpdateNotificationSettingHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new UpdateNotificationSettingHandler(mockPrisma as never);
  });

  it('알림 설정을 upsert해야 한다', async () => {
    const setting = { id: 'ns-1', telegramChatId: '12345', notifyOrders: true };
    mockPrisma.notificationSetting.upsert.mockResolvedValue(setting);

    const result = await handler.execute(
      new UpdateNotificationSettingCommand('user-1', {
        telegramChatId: '12345',
        notifyOrders: true,
      } as never),
    );

    expect(result).toEqual(setting);
    expect(mockPrisma.notificationSetting.upsert).toHaveBeenCalled();
  });
});
