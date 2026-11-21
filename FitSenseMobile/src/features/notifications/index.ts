import { addNativeListener } from '../../services/native';
import { Notification } from '../../services/native';
import type { ExerciseActiveSession } from '../../types/native-interface';

/**
 * Khởi tạo listener cho EXERCISE_STATE FINISHED -> hiển thị thông báo hoàn thành bài tập.
 * Gọi hàm này một lần khi app khởi động (ví dụ trong RootNavigator hoặc SyncGate).
 */
export function setupExerciseFinishedNotification(): () => void {
  return addNativeListener('EXERCISE_STATE', (payload) => {
    if (payload.state === 'FINISHED') {
      showExerciseFinishedNotification(payload.session);
    }
  });
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = Math.imul(31, hash) + char;
    hash = Math.trunc(hash);
  }
  return Math.abs(hash);
}

async function showExerciseFinishedNotification(session: ExerciseActiveSession) {
  try {
    const status = await Notification.ensureReady();
    if (status !== 'GRANTED') {
      return; // Không có quyền, bỏ qua
    }

    const distanceKm = (session.distanceM / 1000).toFixed(2);
    const durationMin = Math.round((Date.now() - session.startedAtMs - session.pausedTotalMs) / 60000);

    await Notification.show({
      id: hashString(`exercise_${session.sessionId}`),
      title: 'Hoàn thành bài tập! 🎉',
      body: `${session.type} • ${distanceKm} km • ${durationMin} phút`,
      channelId: 'fitsense_goal',
    });
  } catch {
    // Fail silently - notification is best effort
  }
}