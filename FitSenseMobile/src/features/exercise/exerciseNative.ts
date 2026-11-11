import {
  Alert,
  Linking,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  ExerciseActiveSession,
  ExerciseType,
  LocalExerciseRow,
  NativeExercisePoint,
} from './types';

const { ExerciseModule } = NativeModules;
const eventEmitter = ExerciseModule ? new NativeEventEmitter(ExerciseModule) : null;

export type ExerciseNativeEvent =
  | { state: 'STARTED' | 'PAUSED' | 'RESUMED' | 'FINISHED'; session: ExerciseActiveSession }
  | { state: 'POINT_RECORDED'; point: NativeExercisePoint; distanceM: number };

export const exerciseNative = {
  isAvailable: (): boolean => Boolean(ExerciseModule),

  requestLocationPermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const fineGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (!fineGranted) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Cần quyền truy cập vị trí',
            message:
              'FitSense cần quyền vị trí chính xác để ghi lại quãng đường và lộ trình buổi tập ngay cả khi tắt màn hình.',
            buttonNeutral: 'Hỏi lại sau',
            buttonNegative: 'Từ chối',
            buttonPositive: 'Đồng ý',
          }
        );

        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Quyền vị trí bị tắt',
            'Bạn đã từ chối quyền vị trí. Vui lòng mở Cài đặt ứng dụng và cấp quyền Vị trí để sử dụng tính năng GPS.',
            [
              { text: 'Hủy', style: 'cancel' },
              { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
            ]
          );
          return false;
        }
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }

      // Request POST_NOTIFICATIONS on Android 13+ so Foreground Service notification displays properly
      if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      }

      return true;
    } catch (err) {
      console.warn('Error requesting location permission:', err);
      return false;
    }
  },

  start: async (type: ExerciseType): Promise<ExerciseActiveSession> => {
    if (!ExerciseModule) {
      throw new Error('ExerciseModule native module is not available');
    }
    return ExerciseModule.start(type);
  },

  pause: async (): Promise<ExerciseActiveSession> => {
    if (!ExerciseModule) {
      throw new Error('ExerciseModule native module is not available');
    }
    return ExerciseModule.pause();
  },

  resume: async (): Promise<ExerciseActiveSession> => {
    if (!ExerciseModule) {
      throw new Error('ExerciseModule native module is not available');
    }
    return ExerciseModule.resume();
  },

  finish: async (): Promise<ExerciseActiveSession> => {
    if (!ExerciseModule) {
      throw new Error('ExerciseModule native module is not available');
    }
    return ExerciseModule.finish();
  },

  getActiveSession: async (): Promise<ExerciseActiveSession | null> => {
    if (!ExerciseModule) return null;
    return ExerciseModule.getActiveSession();
  },

  getLocalExercises: async (limit = 20, offset = 0): Promise<LocalExerciseRow[]> => {
    if (!ExerciseModule) return [];
    return ExerciseModule.getLocalExercises(limit, offset);
  },

  getLocalExercisePoints: async (sessionId: string): Promise<NativeExercisePoint[]> => {
    if (!ExerciseModule) return [];
    return ExerciseModule.getLocalExercisePoints(sessionId);
  },

  getPendingSyncExercises: async (limit = 20): Promise<LocalExerciseRow[]> => {
    if (!ExerciseModule) return [];
    return ExerciseModule.getPendingSyncExercises(limit);
  },

  markSessionSynced: async (sessionId: string): Promise<boolean> => {
    if (!ExerciseModule) return false;
    return ExerciseModule.markSessionSynced(sessionId);
  },

  subscribe: (listener: (event: ExerciseNativeEvent) => void): (() => void) => {
    if (!eventEmitter) return () => {};
    const sub = eventEmitter.addListener('EXERCISE_STATE', listener);
    return () => sub.remove();
  },
};
