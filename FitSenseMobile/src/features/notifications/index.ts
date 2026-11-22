import { addNativeListener, Notification } from '../../services/native';
import {
  onMessagingMessage,
  onMessagingTokenRefresh,
  registerBackgroundMessageHandler,
} from '../../services/firebase';
import type {
  ExerciseActiveSession,
  NotificationChannelId,
} from '../../types/native-interface';
import { notificationApi } from './notificationApi';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = Math.imul(31, hash) + char;
    hash = Math.trunc(hash);
  }
  return Math.abs(hash);
}

function channelForFcmType(type?: string): NotificationChannelId {
  if (type === 'GOAL_ACHIEVED' || type === 'WEEKLY_REPORT') {
    return 'fitsense_goal';
  }
  return 'fitsense_default';
}

/**
 * Khởi tạo listener cho EXERCISE_STATE FINISHED -> hiển thị thông báo hoàn thành bài tập.
 */
export function setupExerciseFinishedNotification(): () => void {
  return addNativeListener('EXERCISE_STATE', (payload) => {
    if (payload.state === 'FINISHED') {
      showExerciseFinishedNotification(payload.session);
    }
  });
}

/** Hiển thị thông báo cục bộ khi nhận FCM lúc app đang mở (foreground). */
export function setupForegroundFcmNotification(): () => void {
  try {
    return onMessagingMessage(async (remoteMessage) => {
      const status = await Notification.ensureReady().catch(() => 'DENIED');
      if (status !== 'GRANTED') return;

      const title =
        remoteMessage.notification?.title ??
        (typeof remoteMessage.data?.title === 'string'
          ? remoteMessage.data.title
          : 'FitSense');
      const body =
        remoteMessage.notification?.body ??
        (typeof remoteMessage.data?.body === 'string'
          ? remoteMessage.data.body
          : '');
      if (!title && !body) return;

      const msgType =
        typeof remoteMessage.data?.type === 'string'
          ? remoteMessage.data.type
          : undefined;
      const msgKey = remoteMessage.messageId || `${Date.now()}`;

      await Notification.show({
        id: hashString(`fcm_${msgKey}`),
        title,
        body,
        channelId: channelForFcmType(msgType),
      }).catch(() => {});
    });
  } catch {
    return () => {};
  }
}

/** Tự đồng bộ lên backend nếu FCM token của thiết bị được làm mới. */
export function setupPushTokenSync(): () => void {
  try {
    return onMessagingTokenRefresh((newToken) => {
      notificationApi.registerDevice(newToken).catch(() => {});
    });
  } catch {
    return () => {};
  }
}

/** Đăng ký handler chạy nền FCM ở entrypoint `index.js`. */
export function registerBackgroundFcmHandler(): void {
  try {
    registerBackgroundMessageHandler(async (remoteMessage) => {
      // Android tự hiển thị payload có `notification`. Với data-only push, hiển thị fallback local.
      if (remoteMessage.notification) return;
      const title =
        typeof remoteMessage.data?.title === 'string'
          ? remoteMessage.data.title
          : null;
      const body =
        typeof remoteMessage.data?.body === 'string'
          ? remoteMessage.data.body
          : null;
      if (!title || !body) return;

      const status = await Notification.ensureReady().catch(() => 'DENIED');
      if (status !== 'GRANTED') return;

      await Notification.show({
        id: hashString(`fcm_bg_${remoteMessage.messageId || Date.now()}`),
        title,
        body,
        channelId: 'fitsense_default',
      }).catch(() => {});
    });
  } catch {
    // Headless / test environment without native Firebase app
  }
}

async function showExerciseFinishedNotification(session: ExerciseActiveSession) {
  try {
    const status = await Notification.ensureReady();
    if (status !== 'GRANTED') {
      return;
    }

    const distanceKm = (session.distanceM / 1000).toFixed(2);
    const durationMin = Math.round(
      (Date.now() - session.startedAtMs - session.pausedTotalMs) / 60000,
    );

    await Notification.show({
      id: hashString(`exercise_${session.sessionId}`),
      title: 'Hoàn thành bài tập! 🎉',
      body: `${session.type} • ${distanceKm} km • ${durationMin} phút`,
      channelId: 'fitsense_goal',
    });
  } catch {
    // Best effort
  }
}
