import { notificationApi, getDeviceId } from '../notificationApi';
import { apiClient } from '../../../services/api/client';

jest.mock('../../../services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../../services/firebase', () => ({
  getFcmToken: jest.fn().mockResolvedValue('mock-fcm-token'),
}));

describe('notificationApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getDeviceId generates and caches a consistent device id', () => {
    const id1 = getDeviceId();
    const id2 = getDeviceId();
    expect(id1).toBeTruthy();
    expect(id1).toEqual(id2);
  });

  it('getSettings fetches current notification preferences', async () => {
    const mockSettings = {
      weeklyReportEnabled: true,
      workoutRemindersEnabled: false,
      goalAchievementsEnabled: true,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { success: true, data: mockSettings },
    });

    const result = await notificationApi.getSettings();
    expect(apiClient.get).toHaveBeenCalledWith('/api/notifications/settings');
    expect(result).toEqual(mockSettings);
  });

  it('updateSettings sends updated preferences to server', async () => {
    const updated = {
      weeklyReportEnabled: false,
      workoutRemindersEnabled: true,
      goalAchievementsEnabled: true,
    };
    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { success: true, data: updated },
    });

    const result = await notificationApi.updateSettings(updated);
    expect(apiClient.put).toHaveBeenCalledWith('/api/notifications/settings', updated);
    expect(result).toEqual(updated);
  });

  it('sendTestNotification invokes backend test endpoint', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true, data: { dispatchedCount: 1 } },
    });

    const result = await notificationApi.sendTestNotification();
    expect(apiClient.post).toHaveBeenCalledWith('/api/notifications/test-send');
    expect(result.dispatchedCount).toBe(1);
  });

  it('registerDevice sends device metadata and fcmToken', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    await notificationApi.registerDevice('custom-token');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/notifications/devices',
      expect.objectContaining({
        deviceId: expect.any(String),
        platform: expect.any(String),
        fcmToken: 'custom-token',
      })
    );
  });
});
