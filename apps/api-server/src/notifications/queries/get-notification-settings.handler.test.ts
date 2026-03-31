import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetNotificationSettingsHandler } from './get-notification-settings.handler';
import { GetNotificationSettingsQuery } from './get-notification-settings.query';

const mockPrisma = { notificationSetting: { findUnique: vi.fn() } };

describe('GetNotificationSettingsHandler', () => {
  let handler: GetNotificationSettingsHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetNotificationSettingsHandler(mockPrisma as never);
  });

  it('기존 설정을 반환해야 한다', async () => {
    const setting = {
      telegramChatId: '12345',
      notifyOrders: true,
      notifySignals: false,
      notifyRisks: true,
    };
    mockPrisma.notificationSetting.findUnique.mockResolvedValue(setting);

    const result = await handler.execute(new GetNotificationSettingsQuery('user-1'));
    expect(result).toEqual(setting);
  });

  it('설정이 없으면 기본값을 반환해야 한다', async () => {
    mockPrisma.notificationSetting.findUnique.mockResolvedValue(null);

    const result = await handler.execute(new GetNotificationSettingsQuery('user-1'));
    expect(result).toEqual({
      telegramChatId: null,
      notifyOrders: true,
      notifySignals: true,
      notifyRisks: false,
    });
  });
});
