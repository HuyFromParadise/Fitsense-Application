import type {
  SyncEntityType,
  SyncHandler,
  SyncItem,
  SyncResult,
} from '../../types/native-interface';
import { Sync } from '../native';

/**
 * SyncManager (F8 — B): mỗi feature đăng ký một `SyncHandler`.
 * Ngày 1 chỉ nối xuống native stub; logic hàng đợi nằm ở Room + SyncModule.
 */
class SyncManager {
  private readonly handlers = new Map<SyncEntityType, SyncHandler>();

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

  enqueue(
    entityType: SyncEntityType,
    clientId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return Sync.enqueue(entityType, clientId, payload);
  }

  getPendingCount(): Promise<number> {
    return Sync.getPendingCount();
  }

  syncNow(): Promise<{ processed: number; failed: number }> {
    return Sync.syncNow();
  }

  getLastSyncAt(): Promise<number | null> {
    return Sync.getLastSyncAt();
  }
}

export const syncManager = new SyncManager();
