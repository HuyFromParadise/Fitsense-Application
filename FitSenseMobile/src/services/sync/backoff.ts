/**
 * Retry delay: 60s doubling per attempt, capped at 30 phút, jitter 0.5x–1.5x.
 * `attempts` = số lần đã thất bại (0 cho lần đầu).
 */
export function backoffDelayMs(attempts: number, random: () => number = Math.random): number {
  const base = Math.min(60_000 * 2 ** attempts, 1_800_000);
  return Math.round(base * (0.5 + random()));
}
