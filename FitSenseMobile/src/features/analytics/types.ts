export interface DailyBreakdownItem {
  date: string; // yyyy-MM-dd
  steps: number;
  distanceM: number;
  calories: number;
  activeMinutes: number;
  exerciseCount: number;
}

export interface PeriodAnalytics {
  periodStart: string;
  periodEnd: string;
  totalSteps: number;
  averageStepsPerDay: number;
  totalDistanceM: number;
  totalCalories: number;
  totalActiveMinutes: number;
  totalExerciseCount: number;
  totalExerciseSeconds: number;
  bestDay: string | null;
  goalCompletionRate: number;
  previous: PeriodAnalytics | null;
  dailyBreakdown: DailyBreakdownItem[] | null;
}
