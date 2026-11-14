import { goalProgress, sumWeeklyExercises, weekStartMs } from '../goalProgress';
import type { LocalExerciseRow } from '../../../types/native-interface';
import type { Goal } from '../types';

const daily = { date: '2026-11-14', steps: 4000, distanceM: 2500, calories: 150, activeMinutes: 40 };

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: 'g1',
    type: 'DAILY_STEPS',
    targetValue: 8000,
    startsOn: '2026-11-14',
    endsOn: null,
    enabled: true,
    createdAt: '2026-11-14T00:00:00Z',
    ...overrides,
  };
}

function exercise(startedAtMs: number, overrides: Partial<LocalExerciseRow>): LocalExerciseRow {
  return {
    id: `e-${startedAtMs}-${Math.random()}`,
    type: 'RUNNING',
    status: 'FINISHED',
    startedAtMs,
    endedAtMs: startedAtMs + 600_000,
    pausedTotalMs: 0,
    pointCount: 10,
    distanceM: 1000,
    durationSeconds: 600,
    calories: 80,
    updatedAtMs: startedAtMs,
    syncState: 'SYNCED',
    ...overrides,
  };
}

describe('goalProgress', () => {
  it('computes daily progress and clamps to 1', () => {
    expect(goalProgress(goal({}), daily, { count: 0, durationSeconds: 0 })).toBeCloseTo(0.5);
    expect(
      goalProgress(goal({ targetValue: 1000 }), daily, { count: 0, durationSeconds: 0 }),
    ).toBe(1);
  });

  it('maps distance, calories and weekly types', () => {
    expect(
      goalProgress(goal({ type: 'DAILY_DISTANCE', targetValue: 5000 }), daily, {
        count: 0,
        durationSeconds: 0,
      }),
    ).toBeCloseTo(0.5);
    expect(
      goalProgress(goal({ type: 'DAILY_CALORIES', targetValue: 300 }), daily, {
        count: 0,
        durationSeconds: 0,
      }),
    ).toBeCloseTo(0.5);
    expect(
      goalProgress(
        goal({ type: 'WEEKLY_EXERCISE_DURATION', targetValue: 60 }),
        daily,
        { count: 0, durationSeconds: 1800 },
      ),
    ).toBeCloseTo(0.5);
    expect(
      goalProgress(
        goal({ type: 'WEEKLY_EXERCISE_COUNT', targetValue: 4 }),
        daily,
        { count: 2, durationSeconds: 0 },
      ),
    ).toBeCloseTo(0.5);
  });

  it('treats a non-positive target as zero progress', () => {
    expect(goalProgress(goal({ targetValue: 0 }), daily, { count: 0, durationSeconds: 0 })).toBe(0);
  });
});

describe('sumWeeklyExercises', () => {
  it('counts only FINISHED exercises inside the current week', () => {
    const weekStart = weekStartMs(new Date('2026-11-14T10:00:00')); // Saturday
    const inside = exercise(weekStart + 60_000, { durationSeconds: 900 });
    const before = exercise(weekStart - 60_000, {});
    const active = exercise(weekStart + 120_000, { status: 'ACTIVE' });

    expect(sumWeeklyExercises([inside, before, active], weekStart)).toEqual({
      count: 1,
      durationSeconds: 900,
    });
  });

  it('uses Monday 00:00 as the week start', () => {
    const weekStart = weekStartMs(new Date('2026-11-14T10:00:00'));
    expect(new Date(weekStart).getDay()).toBe(1);
  });
});
