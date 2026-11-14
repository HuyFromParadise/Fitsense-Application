import type { TodayActivity } from '../../stores/useTodayActivity';
import type { LocalExerciseRow } from '../../types/native-interface';
import type { Goal } from './types';

export interface WeeklyExerciseTotals {
  count: number;
  durationSeconds: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Thứ Hai 00:00 giờ địa phương của tuần hiện tại. */
export function weekStartMs(now: Date = new Date()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start.getTime();
}

export function weekEndMs(now: Date = new Date()): number {
  return weekStartMs(now) + 7 * DAY_MS;
}

/** Chỉ tính buổi đã kết thúc trong tuần hiện tại. */
export function sumWeeklyExercises(
  rows: LocalExerciseRow[],
  weekStart: number,
  weekEnd: number = weekStart + 7 * DAY_MS,
): WeeklyExerciseTotals {
  return rows.reduce<WeeklyExerciseTotals>(
    (totals, row) => {
      if (row.status !== 'FINISHED') return totals;
      if (row.startedAtMs < weekStart || row.startedAtMs >= weekEnd) return totals;
      return {
        count: totals.count + 1,
        durationSeconds: totals.durationSeconds + row.durationSeconds,
      };
    },
    { count: 0, durationSeconds: 0 },
  );
}

/**
 * Tỉ lệ 0..1. Đơn vị target: bước, mét, kcal, phút, số buổi
 * (WEEKLY_EXERCISE_DURATION dùng phút vì UI hiển thị phút).
 */
export function goalProgress(
  goal: Goal,
  daily: TodayActivity,
  weekly: WeeklyExerciseTotals,
): number {
  if (goal.targetValue <= 0) return 0;

  const current = (() => {
    switch (goal.type) {
      case 'DAILY_STEPS':
        return daily.steps;
      case 'DAILY_DISTANCE':
        return daily.distanceM;
      case 'DAILY_CALORIES':
        return daily.calories;
      case 'WEEKLY_EXERCISE_DURATION':
        return weekly.durationSeconds / 60;
      case 'WEEKLY_EXERCISE_COUNT':
        return weekly.count;
    }
  })();

  return Math.min(Math.max(current / goal.targetValue, 0), 1);
}

export const GOAL_TYPE_LABEL: Record<Goal['type'], string> = {
  DAILY_STEPS: 'Bước chân mỗi ngày',
  DAILY_DISTANCE: 'Quãng đường mỗi ngày',
  DAILY_CALORIES: 'Calo mỗi ngày',
  WEEKLY_EXERCISE_DURATION: 'Thời gian tập mỗi tuần',
  WEEKLY_EXERCISE_COUNT: 'Số buổi tập mỗi tuần',
};

export function formatGoalProgress(
  goal: Goal,
  daily: TodayActivity,
  weekly: WeeklyExerciseTotals,
): string {
  const target = goal.targetValue;
  switch (goal.type) {
    case 'DAILY_STEPS':
      return `${Math.round(daily.steps).toLocaleString()} / ${target.toLocaleString()} bước`;
    case 'DAILY_DISTANCE':
      return `${(daily.distanceM / 1000).toFixed(2)} / ${(target / 1000).toFixed(1)} km`;
    case 'DAILY_CALORIES':
      return `${Math.round(daily.calories)} / ${target.toLocaleString()} kcal`;
    case 'WEEKLY_EXERCISE_DURATION':
      return `${Math.round(weekly.durationSeconds / 60)} / ${target.toLocaleString()} phút`;
    case 'WEEKLY_EXERCISE_COUNT':
      return `${weekly.count} / ${target.toLocaleString()} buổi`;
  }
}
