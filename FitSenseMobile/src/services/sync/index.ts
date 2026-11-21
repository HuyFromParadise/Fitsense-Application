import NetInfo from '@react-native-community/netinfo';

import { useAuthStore } from '../../stores/useAuthStore';
import { useSyncStatus } from '../../stores/useSyncStatus';
import type {
  StepSnapshotRow,
  SyncEntityType,
  SyncHandler,
  SyncItem,
  SyncResult,
} from '../../types/native-interface';
import { toApiError } from '../api/errors';
import { LocalDb, Sync } from '../native';
import { syncDailyActivities, type SyncItemResult } from './activityApi';
import { backoffDelayMs } from './backoff';
import { dailyActivityClientId, toDailyActivityPayload } from './dailyActivity';

const ENTITY: SyncEntityType = 'DAILY_ACTIVITY';
// `/api/activities/sync` giới hạn 31 item/request (Day 8). Đổi sang `/api/sync/reconcile`
// (Day 9) thì mới nâng lên 500.
const BATCH_SIZE = 31;
const MAX_BATCHES = 10;
const BACKFILL_LIMIT = 100;
const SYNCED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * SyncManager (F8 - B): JS điều phối hàng đợi Room qua axios.
 * Native chỉ giữ primitive; mọi retry/backoff nằm ở đây.
 */
class SyncManager {
  private readonly handlers = new Map<SyncEntityType, SyncHandler>();
  private syncing = false;
  private initialized = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeNetInfo: (() => void) | null = null;

  registerHandler(handler: SyncHandler): void {
    this.handlers.set(handler.entityType, handler);
  }

  getHandler(entityType: SyncEntityType): SyncHandler | undefined {
    return this.handlers.get(entityType);
  }

  async collectPending(entityType: SyncEntityType, limit: number): Promise<SyncItem[]> {
    return this.handlers.get(entityType)?.collectPending(limit) ?? [];
  }

  async onResult(item: SyncItem, result: SyncResult): Promise<void> {
    await this.handlers.get(item.entityType)?.onResult(item, result);
  }

  /** Enqueue ngày hiện tại; native upsert giữ payload mới nhất và reset PENDING. */
  async enqueueDailyActivity(row: StepSnapshotRow, triggerSync = true): Promise<void> {
    await Sync.enqueue(
      ENTITY,
      dailyActivityClientId(row),
      toDailyActivityPayload(row),
    );
    if (triggerSync) {
      this.syncNow().catch(() => {});
    }
  }

  /** Nút "Thử lại": đưa mọi item FAILED về PENDING ngay rồi sync. */
  async retryFailed(): Promise<{ processed: number; failed: number }> {
    await Sync.resetForRetry();
    return this.syncNow();
  }

  async syncNow(): Promise<{ processed: number; failed: number }> {
    if (this.syncing) {
      return { processed: 0, failed: 0 };
    }
    if (!useAuthStore.getState().isAuthenticated) {
      return { processed: 0, failed: 0 };
    }
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      // Offline: vẫn phải cho chip biết còn bao nhiêu item đang chờ.
      const pending = await Sync.getPendingCount().catch(() => 0);
      useSyncStatus.getState().setStatus({ pending, syncing: false });
      return { processed: 0, failed: 0 };
    }

    this.syncing = true;
    useSyncStatus.getState().setStatus({ syncing: true });

    let processed = 0;
    let failed = 0;
    let earliestRetryAt = Number.POSITIVE_INFINITY;
    let lastError: string | null = null;

    try {
      if (!this.initialized) {
        this.initialized = true;
        // App bị kill giữa lúc sync để lại row SYNCING; đưa về PENDING để không mất.
        await Sync.resetSyncing();
        await Sync.deleteSynced(Date.now() - SYNCED_RETENTION_MS);
      }
      await this.backfill();

      for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
        const due = await Sync.getDue(ENTITY, BATCH_SIZE);
        if (due.length === 0) {
          break;
        }

        const ids = due.map(row => row.id);
        await Sync.markSyncing(ids);

        let results: SyncItemResult[];
        try {
          results = await syncDailyActivities(
            due.map(row => JSON.parse(row.payloadJson)),
          );
        } catch (error) {
          const apiError = toApiError(error);
          lastError = apiError.message;
          // 400 là lỗi dữ liệu do app sinh: không retry vô hạn.
          const permanent = apiError.status === 400;
          for (const row of due) {
            const nextAttemptAt = permanent
              ? Number.MAX_SAFE_INTEGER
              : Date.now() + backoffDelayMs(row.attempts);
            if (!permanent) {
              earliestRetryAt = Math.min(earliestRetryAt, nextAttemptAt);
            }
            await Sync.markFailed(
              row.id,
              row.attempts + 1,
              nextAttemptAt,
              apiError.message,
            );
          }
          failed += due.length;
          break;
        }

        const byClientId = new Map(results.map(result => [result.clientId, result]));
        const syncedIds: number[] = [];

        for (const row of due) {
          const result = byClientId.get(row.clientId);
          const date = row.clientId.split('|')[0];

          if (result && result.status !== 'REJECTED') {
            syncedIds.push(row.id);
            await LocalDb.markActivitySyncState(date, 'SYNCED');
            continue;
          }

          const reason = result?.reason ?? 'Server không trả kết quả cho item';
          lastError = reason;
          const permanent = result?.status === 'REJECTED';
          const nextAttemptAt = permanent
            ? Number.MAX_SAFE_INTEGER
            : Date.now() + backoffDelayMs(row.attempts);
          if (!permanent) {
            earliestRetryAt = Math.min(earliestRetryAt, nextAttemptAt);
          }
          await Sync.markFailed(
            row.id,
            row.attempts + 1,
            nextAttemptAt,
            reason,
          );
          failed += 1;
        }

        if (syncedIds.length > 0) {
          await Sync.markSynced(syncedIds);
          processed += syncedIds.length;
          useSyncStatus.getState().setStatus({ lastSyncAtMs: Date.now() });
        }
      }
    } finally {
      this.syncing = false;
      const pending = await Sync.getPendingCount().catch(() => 0);
      useSyncStatus.getState().setStatus({ pending, syncing: false, lastError });
    }

    if (earliestRetryAt !== Number.POSITIVE_INFINITY) {
      this.scheduleRetry(earliestRetryAt);
    }
    return { processed, failed };
  }

  start(): void {
    this.stop();
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.syncNow().catch(() => {});
      }
    });
    this.syncNow().catch(() => {});
  }

  stop(): void {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /** Đăng xuất: sync lần cuối (best effort) rồi xoá dữ liệu của user cũ. */
  async clearLocalData(): Promise<void> {
    this.stop();
    await this.syncNow().catch(() => {});
    await LocalDb.clearAllActivities();
    await Sync.clearAll();
    useSyncStatus.getState().reset();
  }

  private async backfill(): Promise<void> {
    const rows = await LocalDb.getUnsynced(BACKFILL_LIMIT);
    for (const row of rows) {
      await this.enqueueDailyActivity(row, false);
    }
  }

  private scheduleRetry(atMs: number): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.syncNow().catch(() => {});
    }, Math.max(0, atMs - Date.now()));
  }
}

export const syncManager = new SyncManager();
