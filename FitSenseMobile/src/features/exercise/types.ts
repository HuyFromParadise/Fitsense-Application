export type ExerciseType = 'WALKING' | 'RUNNING' | 'CYCLING';
export type ExerciseStatus = 'ACTIVE' | 'PAUSED' | 'FINISHED' | 'DISCARDED';

export interface GpsPoint {
  seq: number;
  latitude: number;
  longitude: number;
  altitudeM?: number | null;
  speedMps?: number | null;
  accuracyM?: number | null;
  recordedAt: string; // ISO date-time
}

export interface NativeExercisePoint {
  seq: number;
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  speedMps: number | null;
  accuracyM: number | null;
  recordedAtMs: number;
}

export interface ExerciseMetrics {
  distanceM: number;
  durationSeconds: number;
  avgPaceSecPerKm: number | null;
  avgSpeedMps: number | null;
  calories: number;
}

export interface ExerciseSummary {
  id: string;
  type: ExerciseType;
  status: ExerciseStatus;
  startedAt: string;
  endedAt: string | null;
  pausedSeconds: number;
  metrics: ExerciseMetrics;
  isLocalOnly?: boolean;
  syncState?: string;
}

export interface ExerciseDetail extends ExerciseSummary {
  gpsPoints: GpsPoint[];
}

export interface ExerciseCreateRequest {
  id: string;
  type: ExerciseType;
  status: ExerciseStatus;
  startedAt: string;
  endedAt?: string | null;
  pausedSeconds: number;
  gpsPoints?: GpsPoint[];
  metrics?: ExerciseMetrics;
}

export interface ExerciseUpdateRequest {
  status: ExerciseStatus;
  endedAt?: string | null;
  pausedSeconds?: number;
  gpsPoints?: GpsPoint[];
  metrics?: ExerciseMetrics;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ExerciseActiveSession {
  sessionId: string;
  type: ExerciseType;
  status: ExerciseStatus;
  startedAtMs: number;
  pausedTotalMs: number;
  pointCount: number;
  distanceM: number;
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
  syncState: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
}
