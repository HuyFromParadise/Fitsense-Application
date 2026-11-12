/**
 * BẢN COPY. Nguồn chính: fitsense-documentation/native-interface.d.ts
 * Sửa giao ước ở file nguồn trước, rồi copy lại file này.
 *
 * Giao ước giữa native Kotlin (Android) và JavaScript.
 *
 * Đây là BẢN CHÍNH. `FitSenseMobile` import trực tiếp file này qua tsconfig `include`.
 * Tên module / method / event / payload ở hai phía native và TS phải khớp file này.
 * Đổi gì cũng sửa ở đây trước, commit riêng, rồi báo người kia.
 *
 * Ngày 1: mọi method đã tồn tại và trả dữ liệu giả (stub) để UI không bị chặn.
 *
 * Quy ước:
 * - Mọi method async; lỗi trả Promise reject với `code` như NativeModuleError['code'].
 * - Thời gian: epoch milliseconds (number), tên trường có hậu tố `Ms`.
 * - Ngày: `yyyy-MM-dd` theo giờ địa phương của thiết bị.
 * - Khoảng cách: mét. Tốc độ: m/s. Pace: giây/km.
 * - Event payload là một object, không phải positional args.
 */

export type PermissionStatus = 'GRANTED' | 'DENIED' | 'PERMANENTLY_DENIED' | 'NOT_DETERMINED';

export type StepCounterStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'PERMISSION_DENIED';

export type ExerciseType = 'WALKING' | 'RUNNING' | 'CYCLING';

export type ExerciseStatus = 'IDLE' | 'ACTIVE' | 'PAUSED' | 'FINISHED';

export type MotionLabel = 'STILL' | 'WALKING' | 'RUNNING' | 'UNKNOWN';

export type SyncEntityType = 'EXERCISE' | 'DAILY_ACTIVITY';

export type SyncQueueState = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export type SyncResultStatus = 'CREATED' | 'DUPLICATE' | 'CONFLICT' | 'REJECTED';

export type NativeModuleErrorCode =
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'
  | 'SERVICE_NOT_RUNNING'
  | 'INVALID_STATE'
  | 'DATABASE_ERROR'
  | 'UNKNOWN';

export interface NativeModuleError {
  code: NativeModuleErrorCode;
  message: string;
}

/** ---------------------------------------------------------------- StepCounter */

export interface StepCounterSnapshot {
  /** Số bước hôm nay theo giờ địa phương (đã trừ baseline lúc 00:00). */
  stepsToday: number;
  /** Bước kể từ lần boot gần nhất (dùng để phát hiện reboot). */
  stepsSinceBoot: number;
  /** Giá trị counter sensor tại mốc baseline 00:00. */
  baselineCounter: number;
  /** Ngày (yyyy-MM-dd) mà stepsToday thuộc về. */
  date: string;
  /** Số lần boot của thiết bị — đổi thì counter đã reset. */
  bootCount: number;
  status: StepCounterStatus;
  updatedAtMs: number;
}

export interface StepCounterModule {
  getStatus(): Promise<StepCounterStatus>;
  requestPermission(): Promise<PermissionStatus>;
  /** Bắt đầu lắng nghe và emit STEP_UPDATE. Gọi lại khi đang chạy thì no-op. */
  start(): Promise<void>;
  stop(): Promise<void>;
  getTodaySteps(): Promise<StepCounterSnapshot>;
  /** Đọc snapshot theo khoảng ngày (để chốt ngày trước, vẽ biểu đồ). */
  getHistory(fromDate: string, toDate: string): Promise<StepCounterSnapshot[]>;
}

/** ------------------------------------------------------------------- Sensors */

export interface MotionSample {
  x: number;
  y: number;
  z: number;
  /** Độ lớn gia tốc (m/s²) khi type === 'ACCELEROMETER'. */
  magnitude: number;
  timestampMs: number;
}

export interface MotionSnapshot {
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'PERMISSION_DENIED';
  label: MotionLabel;
  /** 0..1, độ tin cậy của nhãn hiện tại. */
  confidence: number;
  lastSample: MotionSample | null;
  updatedAtMs: number;
}

export type SensorSet = 'accelerometer' | 'gyroscope' | 'both';

export interface MotionSensorModule {
  getSnapshot(): Promise<MotionSnapshot>;
  start(sensors: SensorSet): Promise<void>;
  stop(): Promise<void>;
  /** Native kẹp giá trị tối thiểu (~50ms) để không vượt 20 Hz. */
  setEmitInterval(intervalMs: number): Promise<void>;
}

/** ------------------------------------------------------------------ Exercise */

export interface ExerciseActiveSession {
  /** UUID sinh lúc Start; cũng là `id` gửi server (idempotency). */
  sessionId: string;
  type: ExerciseType;
  status: ExerciseStatus;
  startedAtMs: number;
  pausedTotalMs: number;
  pointCount: number;
  distanceM: number;
}

export interface ExercisePoint {
  seq: number;
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  speedMps: number | null;
  accuracyM: number | null;
  recordedAtMs: number;
}

export interface ExerciseModule {
  start(type: ExerciseType): Promise<ExerciseActiveSession>;
  pause(): Promise<ExerciseActiveSession>;
  resume(): Promise<ExerciseActiveSession>;
  /** Kết thúc và lưu vào Room (local_exercise + local_gps_points) ở trạng thái PENDING. */
  finish(): Promise<ExerciseActiveSession>;
  getActiveSession(): Promise<ExerciseActiveSession | null>;
  getStatus(): Promise<{ status: ExerciseStatus; foregroundServiceType: 'location' }>;
}

/** ---------------------------------------------------------------- LocalDb/Room */

export interface StepSnapshotRow {
  date: string;
  timezoneId: string;
  steps: number;
  distanceM: number;
  calories: number;
  activeMinutes: number;
  updatedAtMs: number;
  syncState: SyncQueueState;
}

export interface LocalExerciseRow {
  id: string;
  type: ExerciseType;
  status: ExerciseStatus;
  startedAtMs: number;
  endedAtMs: number | null;
  pausedTotalMs: number;
  pointCount: number;
  distanceM: number;
  durationSeconds: number;
  calories: number;
  updatedAtMs: number;
  syncState: SyncQueueState;
}

/** Bảng `local_activity` — nguồn của useTodayActivity (B sở hữu, A đọc). */
export interface LocalDbModule {
  getTodayActivity(): Promise<StepSnapshotRow | null>;
  upsertTodayActivity(row: StepSnapshotRow): Promise<void>;
  getLocalExercises(limit: number, offset: number): Promise<LocalExerciseRow[]>;
  getLocalExercisePoints(sessionId: string): Promise<ExercisePoint[]>;
}

/** --------------------------------------------------------------- Notification */

export type NotificationChannelId = 'fitsense_default' | 'fitsense_activity' | 'fitsense_goal';

export interface NotificationModule {
  /** Tạo channel + kiểm tra POST_NOTIFICATIONS. */
  ensureReady(): Promise<PermissionStatus>;
  show(input: { id: number; title: string; body: string; channelId: NotificationChannelId }): Promise<void>;
  cancel(id: number): Promise<void>;
  /** Đăng ký WorkManager nhắc bước chân trong khung giờ. */
  scheduleDailyReminders(startHour: number, endHour: number): Promise<void>;
  cancelDailyReminders(): Promise<void>;
}

/** ---------------------------------------------------------------------- Sync */

export interface SyncItem {
  entityType: SyncEntityType;
  clientId: string;
  clientUpdatedAtMs: number;
  payload: Record<string, unknown>;
}

export interface SyncResult {
  entityType: SyncEntityType;
  clientId: string;
  status: SyncResultStatus;
  reason?: string;
  serverVersion?: Record<string, unknown>;
}

/** Mỗi feature tự implement; SyncManager (B) chỉ gọi qua interface này. */
export interface SyncHandler {
  readonly entityType: SyncEntityType;
  collectPending(limit: number): Promise<SyncItem[]>;
  buildRequest(item: SyncItem): Promise<Record<string, unknown>>;
  onResult(item: SyncItem, result: SyncResult): Promise<void>;
}

export interface SyncModule {
  enqueue(entityType: SyncEntityType, clientId: string, payload: Record<string, unknown>): Promise<void>;
  getPendingCount(): Promise<number>;
  syncNow(): Promise<{ processed: number; failed: number }>;
  registerHandler(entityType: SyncEntityType): Promise<void>;
  getLastSyncAt(): Promise<number | null>;
}

/** ------------------------------------------------------------------- Events */

export interface NativeEventMap {
  STEP_UPDATE: StepCounterSnapshot;
  /** ~10-20 Hz khi MotionSensor đang chạy. */
  MOTION_SAMPLE: MotionSample;
  MOTION_LABEL_CHANGED: { label: MotionLabel; confidence: number; timestampMs: number };
  EXERCISE_STATE:
    | { state: 'STARTED' | 'PAUSED' | 'RESUMED'; session: ExerciseActiveSession }
    | { state: 'POINT_RECORDED'; point: ExercisePoint; distanceM: number }
    | { state: 'FINISHED'; session: ExerciseActiveSession };
  SYNC_STATUS: { pending: number; syncing: boolean; lastSyncAtMs: number | null; lastError: string | null };
}

export type NativeEventName = keyof NativeEventMap;

export interface FitSenseNative {
  StepCounter: StepCounterModule;
  MotionSensor: MotionSensorModule;
  Exercise: ExerciseModule;
  LocalDb: LocalDbModule;
  Notification: NotificationModule;
  Sync: SyncModule;
  /** Đăng ký listener; trả hàm hủy. */
  addListener<K extends NativeEventName>(event: K, listener: (payload: NativeEventMap[K]) => void): () => void;
}
