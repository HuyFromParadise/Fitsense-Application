import { LocalDb, Sync } from '../../native';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useSyncStatus } from '../../../stores/useSyncStatus';
import { ApiError } from '../../api/errors';
import { syncManager } from '..';
import { reconcileItems } from '../syncApi';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(async () => ({ isConnected: true })),
    addEventListener: jest.fn(() => () => {}),
  },
}));

jest.mock('../../native', () => ({
  LocalDb: {
    getUnsynced: jest.fn(async () => []),
    upsertTodayActivity: jest.fn(async () => {}),
    markActivitySyncState: jest.fn(async () => {}),
    clearAllActivities: jest.fn(async () => {}),
  },
  Sync: {
    enqueue: jest.fn(async () => {}),
    getDue: jest.fn(async () => []),
    markSyncing: jest.fn(async () => {}),
    markSynced: jest.fn(async () => {}),
    markFailed: jest.fn(async () => {}),
    getPendingCount: jest.fn(async () => 0),
    deleteSynced: jest.fn(async () => {}),
    resetSyncing: jest.fn(async () => {}),
    resetForRetry: jest.fn(async () => {}),
    clearAll: jest.fn(async () => {}),
  },
}));

jest.mock('../syncApi', () => ({ reconcileItems: jest.fn() }));

jest.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: { getState: jest.fn(() => ({ isAuthenticated: true })) },
}));

const SyncMock = Sync as jest.Mocked<typeof Sync>;
const LocalDbMock = LocalDb as jest.Mocked<typeof LocalDb>;
const syncApi = reconcileItems as jest.MockedFunction<typeof reconcileItems>;
const authState = useAuthStore.getState as jest.Mock;
const NetInfo = jest.requireMock('@react-native-community/netinfo').default;

const row = {
  date: '2026-11-16',
  timezoneId: 'UTC',
  steps: 25,
  distanceM: 0.02,
  calories: 1,
  activeMinutes: 0,
  updatedAtMs: 1763280000000,
  syncState: 'PENDING' as const,
};

function queueRow(steps: number, id = 1, attempts = 0) {
  return {
    id,
    entityType: 'DAILY_ACTIVITY' as const,
    clientId: '2026-11-16|UTC',
    payloadJson: JSON.stringify({
      activityDate: '2026-11-16',
      timezoneId: 'UTC',
      steps,
      distanceM: 0,
      calories: 0,
      activeMinutes: 0,
      updatedAt: '2026-11-16T00:00:00Z',
    }),
    attempts,
    nextAttemptAtMs: 0,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  authState.mockReturnValue({ isAuthenticated: true });
  NetInfo.fetch.mockResolvedValue({ isConnected: true });
  SyncMock.getPendingCount.mockResolvedValue(0);
  useSyncStatus.getState().reset();
  (syncManager as unknown as { initialized: boolean }).initialized = false;
});

test('re-enqueueing the same day stores the newest payload', async () => {
  await syncManager.enqueueDailyActivity({ ...row, steps: 25 });
  await syncManager.enqueueDailyActivity({ ...row, steps: 900 });

  expect(SyncMock.enqueue).toHaveBeenLastCalledWith(
    'DAILY_ACTIVITY',
    '2026-11-16|UTC',
    expect.objectContaining({ steps: 900 }),
  );
});

test('enqueueing a daily activity triggers a sync attempt', async () => {
  await syncManager.enqueueDailyActivity(row);
  await new Promise<void>(resolve => setTimeout(() => resolve(), 0));

  expect(SyncMock.getDue).toHaveBeenCalled();
});

test('resets stuck SYNCING rows and prunes old SYNCED rows on first run', async () => {
  await syncManager.syncNow();

  expect(SyncMock.resetSyncing).toHaveBeenCalledTimes(1);
  expect(SyncMock.deleteSynced).toHaveBeenCalledTimes(1);
});

test('backfills unsynced local activity into the queue', async () => {
  LocalDbMock.getUnsynced.mockResolvedValue([{ ...row }]);
  SyncMock.getDue.mockResolvedValue([]);

  await syncManager.syncNow();

  expect(SyncMock.enqueue).toHaveBeenCalledWith(
    'DAILY_ACTIVITY',
    '2026-11-16|UTC',
    expect.objectContaining({ steps: 25 }),
  );
});

test('only asks for DAILY_ACTIVITY rows, 500 at a time', async () => {
  SyncMock.getDue.mockResolvedValue([]);

  await syncManager.syncNow();

  expect(SyncMock.getDue).toHaveBeenCalledWith('DAILY_ACTIVITY', 500);
});

test('manual retry resets FAILED rows before syncing', async () => {
  SyncMock.getDue.mockResolvedValue([]);

  await syncManager.retryFailed();

  expect(SyncMock.resetForRetry).toHaveBeenCalledTimes(1);
  expect(SyncMock.getDue).toHaveBeenCalled();
});

test('marks CREATED/DUPLICATE/CONFLICT as synced and updates local activity', async () => {
  const rows = [queueRow(25, 1), queueRow(30, 2), queueRow(40, 3)];
  SyncMock.getDue.mockResolvedValue(rows);
  syncApi.mockResolvedValue([
    { entityType: 'DAILY_ACTIVITY', clientId: '2026-11-16|UTC', status: 'CREATED' },
  ]);
  SyncMock.getPendingCount.mockResolvedValue(0);

  await syncManager.syncNow();

  expect(SyncMock.markSyncing).toHaveBeenCalledWith([1, 2, 3]);
  expect(SyncMock.markSynced).toHaveBeenCalled();
  expect(LocalDbMock.markActivitySyncState).toHaveBeenCalledWith('2026-11-16', 'SYNCED');
  expect(useSyncStatus.getState().pending).toBe(0);
});

test('sends reconcile items with entityType, clientId and parsed payload', async () => {
  SyncMock.getDue.mockResolvedValue([queueRow(25)]);
  syncApi.mockResolvedValue([
    { entityType: 'DAILY_ACTIVITY', clientId: '2026-11-16|UTC', status: 'DUPLICATE' },
  ]);

  await syncManager.syncNow();

  expect(syncApi).toHaveBeenCalledWith(expect.any(String), [
    {
      entityType: 'DAILY_ACTIVITY',
      clientId: '2026-11-16|UTC',
      payload: expect.objectContaining({ steps: 25 }),
    },
  ]);
});

test('CONFLICT overwrites local activity with the server copy', async () => {
  SyncMock.getDue.mockResolvedValue([queueRow(25)]);
  syncApi.mockResolvedValue([
    {
      entityType: 'DAILY_ACTIVITY',
      clientId: '2026-11-16|UTC',
      status: 'CONFLICT',
      serverVersion: {
        activityDate: '2026-11-16',
        timezoneId: 'UTC',
        steps: 900,
        distanceM: 700,
        calories: 40,
        activeMinutes: 9,
        updatedAt: '2026-11-16T10:00:00Z',
      },
    },
  ]);

  await syncManager.syncNow();

  expect(LocalDbMock.upsertTodayActivity).toHaveBeenCalledWith(
    expect.objectContaining({ date: '2026-11-16', steps: 900, syncState: 'SYNCED' }),
  );
  expect(SyncMock.markSynced).toHaveBeenCalledWith([1]);
});

test('HTTP 400 fails the batch without scheduling a retry', async () => {
  jest.useFakeTimers();
  SyncMock.getDue.mockResolvedValueOnce([queueRow(25)]).mockResolvedValue([]);
  syncApi.mockRejectedValue(new ApiError('bad payload', { status: 400 }));

  await syncManager.syncNow();

  expect(SyncMock.markFailed).toHaveBeenCalledWith(
    1,
    1,
    Number.MAX_SAFE_INTEGER,
    expect.any(String),
  );
  expect(jest.getTimerCount()).toBe(0);
});

test('REJECTED item fails permanently without scheduling a retry', async () => {
  jest.useFakeTimers();
  SyncMock.getDue.mockResolvedValueOnce([queueRow(25)]).mockResolvedValue([]);
  syncApi.mockResolvedValue([
    {
      entityType: 'DAILY_ACTIVITY',
      clientId: '2026-11-16|UTC',
      status: 'REJECTED',
      reason: 'steps âm',
    },
  ]);

  await syncManager.syncNow();

  expect(SyncMock.markFailed).toHaveBeenCalledWith(
    1,
    1,
    Number.MAX_SAFE_INTEGER,
    'steps âm',
  );
  expect(jest.getTimerCount()).toBe(0);
  expect(useSyncStatus.getState().lastError).toBe('steps âm');
});

test('a second sync after success sends no further requests', async () => {
  SyncMock.getDue.mockResolvedValueOnce([queueRow(25)]).mockResolvedValue([]);
  syncApi.mockResolvedValue([
    { entityType: 'DAILY_ACTIVITY', clientId: '2026-11-16|UTC', status: 'CREATED' },
  ]);

  await syncManager.syncNow();
  await syncManager.syncNow();

  expect(syncApi).toHaveBeenCalledTimes(1);
});

test('network errors retry later with backoff and count as pending', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(1_000_000);
  SyncMock.getDue.mockResolvedValueOnce([queueRow(25, 1, 0)]).mockResolvedValue([]);
  syncApi.mockRejectedValue(new ApiError('offline', { code: 'NETWORK_ERROR' }));
  SyncMock.getPendingCount.mockResolvedValue(1);

  await syncManager.syncNow();

  const [, attempts, nextAttemptAt] = SyncMock.markFailed.mock.calls[0];
  expect(attempts).toBe(1);
  expect(nextAttemptAt).toBeGreaterThan(1_000_000);
  expect(jest.getTimerCount()).toBeGreaterThan(0);
  expect(useSyncStatus.getState().pending).toBe(1);
});

test('does nothing when offline or logged out', async () => {
  NetInfo.fetch.mockResolvedValue({ isConnected: false });
  SyncMock.getPendingCount.mockResolvedValue(2);
  await syncManager.syncNow();
  expect(SyncMock.getDue).not.toHaveBeenCalled();
  // Offline vẫn phải báo số item đang chờ để chip không nói dối.
  expect(useSyncStatus.getState().pending).toBe(2);

  NetInfo.fetch.mockResolvedValue({ isConnected: true });
  authState.mockReturnValue({ isAuthenticated: false });
  await syncManager.syncNow();
  expect(SyncMock.getDue).not.toHaveBeenCalled();
});

test('clearLocalData stops, syncs best effort, then clears both tables', async () => {
  const stop = jest.spyOn(syncManager, 'stop');

  await syncManager.clearLocalData();

  expect(stop).toHaveBeenCalled();
  expect(LocalDbMock.clearAllActivities).toHaveBeenCalled();
  expect(SyncMock.clearAll).toHaveBeenCalled();
  expect(useSyncStatus.getState().pending).toBe(0);
});
