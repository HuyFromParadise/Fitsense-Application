import { dashboardMetrics, DEFAULT_DAILY_STEP_GOAL } from '../dashboardMetrics';

describe('dashboardMetrics', () => {
  it('uses fallback profile when none is available', () => {
    const metrics = dashboardMetrics(10000, null);

    expect(metrics.distanceM).toBeCloseTo(7055, 0);
    expect(metrics.calories).toBeCloseTo(246.925, 2);
    expect(metrics.activeMinutes).toBe(100);
    expect(metrics.goalProgress).toBe(1);
    expect(metrics.goalSteps).toBe(DEFAULT_DAILY_STEP_GOAL);
  });

  it('uses profile height and weight when present', () => {
    const metrics = dashboardMetrics(5000, { heightCm: 180, weightKg: 80 });

    expect(metrics.distanceM).toBeCloseTo(5000 * 180 * 0.00415, 3);
    expect(metrics.calories).toBeCloseTo(((5000 * 180 * 0.00415) / 1000) * 80 * 0.5, 3);
    expect(metrics.activeMinutes).toBe(50);
    expect(metrics.goalProgress).toBeCloseTo(5000 / DEFAULT_DAILY_STEP_GOAL, 5);
  });

  it('handles zero and negative steps safely', () => {
    const zero = dashboardMetrics(0, null);
    expect(zero.distanceM).toBe(0);
    expect(zero.calories).toBe(0);
    expect(zero.activeMinutes).toBe(0);
    expect(zero.goalProgress).toBe(0);

    const negative = dashboardMetrics(-50, null);
    expect(negative.steps).toBe(0);
    expect(negative.goalProgress).toBe(0);
  });

  it('caps goal progress at one', () => {
    const metrics = dashboardMetrics(20000, null, 8000);
    expect(metrics.goalProgress).toBe(1);
  });
});
