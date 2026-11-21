import { backoffDelayMs } from '../backoff';

test('doubles per attempt and caps at 30 minutes', () => {
  expect(backoffDelayMs(0, () => 0.5)).toBe(60_000);
  expect(backoffDelayMs(1, () => 0.5)).toBe(120_000);
  expect(backoffDelayMs(20, () => 0.5)).toBe(1_800_000);
});

test('applies jitter between 0.5x and 1.5x', () => {
  expect(backoffDelayMs(0, () => 0)).toBe(30_000);
  expect(backoffDelayMs(0, () => 0.999999)).toBe(90_000);
});
