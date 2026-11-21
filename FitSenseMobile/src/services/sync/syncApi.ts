import type { SyncEntityType, SyncResultStatus } from '../../types/native-interface';
import { apiClient } from '../api/client';
import type { ApiEnvelope } from '../api/health';

export interface SyncOutboundItem {
  entityType: SyncEntityType;
  clientId: string;
  payload: Record<string, unknown>;
}

export interface SyncItemResult {
  entityType: SyncEntityType;
  clientId: string;
  status: SyncResultStatus;
  reason?: string;
  serverVersion?: Record<string, unknown>;
}

/** `POST /api/sync/reconcile` — server xử lý từng item độc lập, tối đa 500 item. */
export async function reconcileItems(
  deviceId: string,
  items: SyncOutboundItem[],
): Promise<SyncItemResult[]> {
  const response = await apiClient.post<
    ApiEnvelope<{ results: SyncItemResult[]; serverTime: string }>
  >('/api/sync/reconcile', { deviceId, items });
  return response.data.data?.results ?? [];
}
