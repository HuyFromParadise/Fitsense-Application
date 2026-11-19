import type { StepSnapshotRow } from '../../types/native-interface';

/** Shape của một item `POST /api/activities/sync` (khớp DailyActivityUpsert backend). */
export interface DailyActivityUpsert {
  activityDate: string;
  timezoneId: string;
  steps: number;
  distanceM: number;
  calories: number;
  activeMinutes: number;
  /** ISO-8601 UTC. */
  updatedAt: string;
}

/** Khớp `clientId` backend dùng cho DAILY_ACTIVITY: `<activityDate>|<timezoneId>`. */
export function dailyActivityClientId(row: StepSnapshotRow): string {
  return `${row.date}|${row.timezoneId}`;
}

export function toDailyActivityPayload(row: StepSnapshotRow): DailyActivityUpsert {
  return {
    activityDate: row.date,
    timezoneId: row.timezoneId,
    steps: row.steps,
    distanceM: row.distanceM,
    calories: row.calories,
    activeMinutes: row.activeMinutes,
    updatedAt: new Date(row.updatedAtMs).toISOString(),
  };
}
