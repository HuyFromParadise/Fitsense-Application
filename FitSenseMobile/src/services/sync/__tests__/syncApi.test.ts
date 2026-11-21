import { apiClient } from '../../api/client';
import { reconcileItems } from '../syncApi';

jest.mock('../../api/client', () => ({ apiClient: { post: jest.fn() } }));

test('posts a reconcile batch and returns the results array', async () => {
  const results = [
    { entityType: 'DAILY_ACTIVITY', clientId: '2026-11-16|UTC', status: 'CREATED' },
  ];
  (apiClient.post as jest.Mock).mockResolvedValue({
    data: { success: true, data: { results, serverTime: '2026-11-16T00:00:00Z' } },
  });

  const items = [
    {
      entityType: 'DAILY_ACTIVITY' as const,
      clientId: '2026-11-16|UTC',
      payload: {
        activityDate: '2026-11-16',
        timezoneId: 'UTC',
        steps: 1,
        distanceM: 0,
        calories: 0,
        activeMinutes: 0,
        updatedAt: '2026-11-16T00:00:00Z',
      },
    },
  ];

  await expect(reconcileItems('device-1', items)).resolves.toEqual(results);
  expect(apiClient.post).toHaveBeenCalledWith('/api/sync/reconcile', {
    deviceId: 'device-1',
    items,
  });
});
