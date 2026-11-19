import { apiClient } from '../../api/client';
import { syncDailyActivities } from '../activityApi';

jest.mock('../../api/client', () => ({ apiClient: { post: jest.fn() } }));

test('posts items and returns result array', async () => {
  const results = [
    { entityType: 'DAILY_ACTIVITY', clientId: '2026-11-16|UTC', status: 'CREATED' },
  ];
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, data: results } });

  const items = [
    {
      activityDate: '2026-11-16',
      timezoneId: 'UTC',
      steps: 1,
      distanceM: 0,
      calories: 0,
      activeMinutes: 0,
      updatedAt: '2026-11-16T00:00:00Z',
    },
  ];

  await expect(syncDailyActivities(items)).resolves.toEqual(results);
  expect(apiClient.post).toHaveBeenCalledWith('/api/activities/sync', { items });
});
