package com.example.fitsense.sync.dto;

/**
 * Kết quả một item sync, dùng chung cho `/api/activities/sync` (Ngày 7)
 * và `/api/sync/reconcile` (F8).
 */
public record SyncItemResult(
        SyncEntityType entityType,
        String clientId,
        SyncStatus status,
        String reason,
        Object serverVersion
) {
    public static SyncItemResult of(
            SyncEntityType entityType, String clientId, SyncStatus status, String reason) {
        return new SyncItemResult(entityType, clientId, status, reason, null);
    }

    public static SyncItemResult conflict(
            SyncEntityType entityType, String clientId, Object serverVersion) {
        return new SyncItemResult(
                entityType, clientId, SyncStatus.CONFLICT, "Client copy is older than server", serverVersion);
    }
}
