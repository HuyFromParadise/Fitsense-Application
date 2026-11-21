import { Platform } from 'react-native';
import { apiClient } from '../../services/api/client';
import { getFcmToken } from '../../services/firebase';
import { getDeviceId } from '../../utils/deviceId';

export { getDeviceId } from '../../utils/deviceId';

export interface DeviceRegistrationRequest {
  deviceId: string;
  platform: string;
  fcmToken?: string;
}

export interface NotificationSettings {
  weeklyReportEnabled: boolean;
  workoutRemindersEnabled: boolean;
  goalAchievementsEnabled: boolean;
}

export const notificationApi = {
  registerDevice: async (overrideFcmToken?: string): Promise<void> => {
    try {
      let fcmToken = overrideFcmToken;
      if (!fcmToken) {
        try {
          fcmToken = (await getFcmToken()) ?? undefined;
        } catch {
          // FCM token may fail in simulator / headless tests; continue without it
        }
      }

      const req: DeviceRegistrationRequest = {
        deviceId: getDeviceId(),
        platform: Platform.OS,
        fcmToken,
      };

      await apiClient.post('/api/notifications/devices', req);
    } catch {
      // Graceful fallback if device registration fails
    }
  },

  getSettings: async (): Promise<NotificationSettings> => {
    const res = await apiClient.get<NotificationSettings>('/api/notifications/settings');
    return res.data;
  },

  updateSettings: async (settings: NotificationSettings): Promise<NotificationSettings> => {
    const res = await apiClient.put<NotificationSettings>('/api/notifications/settings', settings);
    return res.data;
  },

  sendTestNotification: async (): Promise<{ message: string; count: number }> => {
    const res = await apiClient.post<{ message: string; count: number }>('/api/notifications/test-send');
    return res.data;
  },
};
