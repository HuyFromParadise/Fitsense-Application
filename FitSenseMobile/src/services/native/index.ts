import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

import type {
  ExerciseModule,
  ExercisePoint,
  FitSenseNative,
  LocalDbModule,
  MotionSensorModule,
  NativeEventMap,
  NativeEventName,
  NotificationModule,
  StepCounterModule,
  SyncModule,
} from '../../types/native-interface';
import { mockNative } from './mock';

export { mockNative };

function pick<T>(name: string, fallback: T): T {
  const module = (NativeModules as Record<string, T | undefined>)[name];
  return module ?? fallback;
}

// Chỉ Android có native module thật; iOS/test dùng mock để UI không bị chặn.
const useMock = Platform.OS !== 'android';

export const StepCounter: StepCounterModule = useMock
  ? mockNative.StepCounter
  : pick('StepCounter', mockNative.StepCounter);

export const MotionSensor: MotionSensorModule = useMock
  ? mockNative.MotionSensor
  : pick('MotionSensor', mockNative.MotionSensor);

export const Exercise: ExerciseModule = useMock
  ? mockNative.Exercise
  : pick('Exercise', mockNative.Exercise);

export const LocalDb: LocalDbModule = useMock
  ? mockNative.LocalDb
  : pick('LocalDb', pick('LocalDbModule', mockNative.LocalDb));

export const Notification: NotificationModule = useMock
  ? mockNative.Notification
  : pick('Notification', mockNative.Notification);

export const Sync: SyncModule = useMock
  ? mockNative.Sync
  : pick('Sync', mockNative.Sync);

export function addNativeListener<K extends NativeEventName>(
  event: K,
  listener: (payload: NativeEventMap[K]) => void,
): () => void {
  const subscription = DeviceEventEmitter.addListener(event, listener);
  return () => subscription.remove();
}

export const fitSenseNative: FitSenseNative = {
  StepCounter,
  MotionSensor,
  Exercise,
  LocalDb,
  Notification,
  Sync,
  addListener: addNativeListener,
};

export type { ExercisePoint };
