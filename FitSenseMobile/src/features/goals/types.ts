export type GoalType =
  | 'DAILY_STEPS'
  | 'DAILY_DISTANCE'
  | 'DAILY_CALORIES'
  | 'WEEKLY_EXERCISE_DURATION'
  | 'WEEKLY_EXERCISE_COUNT';

export interface Goal {
  id: string;
  type: GoalType;
  targetValue: number;
  startsOn: string;
  endsOn: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface GoalUpsertRequest {
  type: GoalType;
  targetValue: number;
  startsOn?: string;
  endsOn?: string | null;
  enabled?: boolean;
}
