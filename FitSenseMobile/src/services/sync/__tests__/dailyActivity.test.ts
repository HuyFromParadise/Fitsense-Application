import { dailyActivityClientId, toDailyActivityPayload } from '../dailyActivity';

const row = {
  date: '2026-11-16',
  timezoneId: 'Asia/Ho_Chi_Minh',
  steps: 25,
  distanceM: 0.02,
  calories: 1,
  activeMinutes: 0,
  updatedAtMs: 1763280000000,
  syncState: 'PENDING' as const,
};

test('builds clientId exactly like the backend', () => {
  expect(dailyActivityClientId(row)).toBe('2026-11-16|Asia/Ho_Chi_Minh');
});

test('maps row to DailyActivityUpsert with ISO UTC updatedAt', () => {
  expect(toDailyActivityPayload(row)).toEqual({
    activityDate: '2026-11-16',
    timezoneId: 'Asia/Ho_Chi_Minh',
    steps: 25,
    distanceM: 0.02,
    calories: 1,
    activeMinutes: 0,
    updatedAt: new Date(1763280000000).toISOString(),
  });
});
