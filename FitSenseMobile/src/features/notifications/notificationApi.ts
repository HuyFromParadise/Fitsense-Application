import { Platform } from 'react-native';
import { apiClient } from '../../services/api/client';
import type { ApiResponse } from '../../services/api/types';
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
    const res = await apiClient.get<ApiResponse<NotificationSettings>>(
      '/api/notifications/settings',
    );
    return res.data.data;
  },

  updateSettings: async (settings: NotificationSettings): Promise<NotificationSettings> => {
    const res = await apiClient.put<ApiResponse<NotificationSettings>>(
      '/api/notifications/settings',
      settings,
    );
    return res.data.data;
  },

  sendTestNotification: async (): Promise<{ dispatchedCount: number; message?: string }> => {
    const res = await apiClient.post<ApiResponse<{ dispatchedCount: number; message?: string }>>(
      '/api/notifications/test-send',
    );
    return res.data.data;
  },
};
