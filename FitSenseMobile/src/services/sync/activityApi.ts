import type { ApiEnvelope } from '../api/health';
import { apiClient } from '../api/client';
import type { DailyActivityUpsert } from './dailyActivity';

export interface SyncItemResult {
  entityType: 'DAILY_ACTIVITY';
  clientId: string;
  status: 'CREATED' | 'DUPLICATE' | 'CONFLICT' | 'REJECTED';
  reason?: string;
  serverVersion?: Record<string, unknown>;
}

export async function syncDailyActivities(
  items: DailyActivityUpsert[],
): Promise<SyncItemResult[]> {
  const response = await apiClient.post<ApiEnvelope<SyncItemResult[]>>(
    '/api/activities/sync',
    { items },
  );
  return response.data.data ?? [];
}
