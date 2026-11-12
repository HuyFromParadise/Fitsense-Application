export const DEFAULT_HEIGHT_CM = 170;
export const DEFAULT_WEIGHT_KG = 70;
export const DEFAULT_DAILY_STEP_GOAL = 8000;

export interface DashboardProfile {
  heightCm?: number | null;
  weightKg?: number | null;
}

export interface DashboardMetrics {
  steps: number;
  distanceM: number;
  calories: number;
  activeMinutes: number;
  goalSteps: number;
  goalProgress: number;
}

/** Công thức khớp `StepMetrics.kt` để số liệu native và JS không lệch nhau. */
export function dashboardMetrics(
  rawSteps: number,
  profile: DashboardProfile | null | undefined,
  goalSteps: number = DEFAULT_DAILY_STEP_GOAL,
): DashboardMetrics {
  const steps = Math.max(0, Math.round(rawSteps));
  const heightCm = profile?.heightCm ?? DEFAULT_HEIGHT_CM;
  const weightKg = profile?.weightKg ?? DEFAULT_WEIGHT_KG;
  const distanceM = steps * heightCm * 0.00415;
  const calories = (distanceM / 1000) * weightKg * 0.5;
  const goal = goalSteps > 0 ? goalSteps : DEFAULT_DAILY_STEP_GOAL;

  return {
    steps,
    distanceM,
    calories,
    activeMinutes: Math.floor(steps / 100),
    goalSteps: goal,
    goalProgress: Math.min(steps / goal, 1),
  };
}
