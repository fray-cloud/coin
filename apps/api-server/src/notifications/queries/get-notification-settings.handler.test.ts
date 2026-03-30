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

  it('should return existing settings', async () => {
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

  it('should return defaults when no settings exist', async () => {
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
