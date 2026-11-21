import type {
  ExerciseActiveSession,
  FitSenseNative,
  LocalExerciseRow,
  NativeEventMap,
  NativeEventName,
  StepCounterSnapshot,
} from '../../types/native-interface';
import { deviceTimeZone, todayIsoDate } from '../../utils/date';

/**
 * Dữ liệu giả khi module native không có (iOS, Jest) hoặc đang dựng khung.
 * Giữ đúng shape của native-interface.d.ts để UI không phải sửa khi nối native thật.
 */

function makeSession(): ExerciseActiveSession {
  return {
    sessionId: `mock-${Date.now()}`,
    type: 'RUNNING',
    status: 'IDLE',
    startedAtMs: Date.now(),
    pausedTotalMs: 0,
    pointCount: 0,
    distanceM: 0,
  };
}

const stepSnapshot = (): StepCounterSnapshot => ({
  stepsToday: 0,
  stepsSinceBoot: 0,
  baselineCounter: 0,
  date: todayIsoDate(),
  bootCount: 1,
  status: 'AVAILABLE',
  updatedAtMs: Date.now(),
});

type AnyListener = (payload: unknown) => void;
const listeners = new Map<NativeEventName, Set<AnyListener>>();

function emit<K extends NativeEventName>(event: K, payload: NativeEventMap[K]) {
  listeners.get(event)?.forEach(listener => listener(payload));
}

export const mockNative: FitSenseNative = {
  StepCounter: {
    getStatus: async () => 'AVAILABLE',
    requestPermission: async () => 'GRANTED',
    start: async () => {
      emit('STEP_UPDATE', stepSnapshot());
    },
    stop: async () => {},
    getTodaySteps: async () => stepSnapshot(),
    getHistory: async () => [],
  },
  MotionSensor: {
    getSnapshot: async () => ({
      status: 'AVAILABLE',
      label: 'STILL',
      confidence: 0,
      lastSample: null,
      updatedAtMs: Date.now(),
    }),
    start: async () => {},
    stop: async () => {},
    setEmitInterval: async () => {},
  },
  Exercise: {
    start: async () => ({ ...makeSession(), status: 'ACTIVE' }),
    pause: async () => ({ ...makeSession(), status: 'PAUSED' }),
    resume: async () => ({ ...makeSession(), status: 'ACTIVE' }),
    finish: async () => ({ ...makeSession(), status: 'FINISHED' }),
    getActiveSession: async () => null,
    getStatus: async () => ({ status: 'IDLE', foregroundServiceType: 'location' }),
  },
  LocalDb: {
    getTodayActivity: async () => ({
      date: todayIsoDate(),
      timezoneId: deviceTimeZone(),
      steps: 0,
      distanceM: 0,
      calories: 0,
      activeMinutes: 0,
      updatedAtMs: Date.now(),
      syncState: 'PENDING',
    }),
    upsertTodayActivity: async () => {},
    getLocalExercises: async (): Promise<LocalExerciseRow[]> => [],
    getLocalExercisePoints: async () => [],
  },
  Notification: {
    ensureReady: async () => 'GRANTED',
    show: async () => {},
    cancel: async () => {},
    scheduleDailyReminders: async () => {},
    cancelDailyReminders: async () => {},
  },
  Sync: {
    enqueue: async () => {},
    getPendingCount: async () => 0,
    syncNow: async () => ({ processed: 0, failed: 0 }),
    registerHandler: async () => {},
    getLastSyncAt: async () => null,
  },
  addListener: (event, listener) => {
    const set = listeners.get(event) ?? new Set<AnyListener>();
    set.add(listener as AnyListener);
    listeners.set(event, set);
    return () => {
      set.delete(listener as AnyListener);
    };
  },
};
