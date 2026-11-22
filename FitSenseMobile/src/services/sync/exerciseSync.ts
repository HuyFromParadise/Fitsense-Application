import type { ExercisePoint, LocalExerciseRow } from '../../types/native-interface';

/** Shape khớp `ExerciseCreateRequest` phía Backend (dùng cho cả POST /api/exercises và /api/sync/reconcile). */
export type SyncableExerciseStatus = LocalExerciseRow['status'] | 'DISCARDED';

export interface ExerciseSyncPayload extends Record<string, unknown> {
  id: string;
  type: LocalExerciseRow['type'];
  status: SyncableExerciseStatus;
  startedAt: string;
  endedAt: string | null;
  pausedSeconds: number;
  gpsPoints: Array<{
    seq: number;
    latitude: number;
    longitude: number;
    altitudeM: number | null;
    speedMps: number | null;
    accuracyM: number | null;
    recordedAt: string;
  }>;
  metrics: {
    distanceM: number;
    durationSeconds: number;
    avgPaceSecPerKm: number | null;
    avgSpeedMps: number;
    calories: number;
  };
}

export function toExerciseCreatePayload(
  row: Omit<LocalExerciseRow, 'status'> & { status: SyncableExerciseStatus },
  points: ExercisePoint[],
): ExerciseSyncPayload {
  const durationSeconds = row.durationSeconds;
  const distanceM = Math.round(row.distanceM * 100) / 100;
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    startedAt: new Date(row.startedAtMs).toISOString(),
    endedAt: row.endedAtMs ? new Date(row.endedAtMs).toISOString() : null,
    pausedSeconds: Math.floor(row.pausedTotalMs / 1000),
    gpsPoints: points.map(p => ({
      seq: p.seq,
      latitude: p.latitude,
      longitude: p.longitude,
      altitudeM: p.altitudeM,
      speedMps: p.speedMps,
      accuracyM: p.accuracyM,
      recordedAt: new Date(p.recordedAtMs).toISOString(),
    })),
    metrics: {
      distanceM,
      durationSeconds,
      avgPaceSecPerKm:
        distanceM > 0 ? durationSeconds / (distanceM / 1000) : null,
      avgSpeedMps: durationSeconds > 0 ? distanceM / durationSeconds : 0,
      calories: row.calories,
    },
  };
}
