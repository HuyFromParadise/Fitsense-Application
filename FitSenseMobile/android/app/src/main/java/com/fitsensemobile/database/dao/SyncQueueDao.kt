package com.fitsensemobile.database.dao

import androidx.room.Dao
import androidx.room.Query
import com.fitsensemobile.database.entity.SyncQueueEntity

/** Chủ: B (F8). */
@Dao
interface SyncQueueDao {

    /**
     * Upsert theo unique index (entity_type, client_id): enqueue lại cùng ngày
     * phải cập nhật payload và đưa row về PENDING (Room @Upsert chỉ so primary key).
     */
    @Query(
        """
        INSERT INTO sync_queue (entity_type, client_id, operation, payload, state, attempts, next_attempt_at, last_error, created_at, updated_at)
        VALUES (:entityType, :clientId, :operation, :payload, 'PENDING', 0, :now, NULL, :now, :now)
        ON CONFLICT(entity_type, client_id) DO UPDATE SET
          operation = excluded.operation, payload = excluded.payload, state = 'PENDING',
          attempts = 0, next_attempt_at = excluded.next_attempt_at, last_error = NULL,
          updated_at = excluded.updated_at
        """,
    )
    suspend fun enqueue(
        entityType: String,
        clientId: String,
        operation: String,
        payload: String,
        now: Long,
    )

    @Query(
        "SELECT * FROM sync_queue WHERE entity_type = :entityType AND state = 'PENDING' " +
            "AND next_attempt_at <= :now ORDER BY created_at ASC LIMIT :limit",
    )
    suspend fun getDue(entityType: String, now: Long, limit: Int): List<SyncQueueEntity>

    @Query("UPDATE sync_queue SET state = 'SYNCING', updated_at = :now WHERE id IN (:ids)")
    suspend fun markSyncing(ids: List<Long>, now: Long)

    @Query(
        "UPDATE sync_queue SET state = 'SYNCED', attempts = 0, last_error = NULL, " +
            "updated_at = :now WHERE id IN (:ids)",
    )
    suspend fun markSynced(ids: List<Long>, now: Long)

    @Query(
        "UPDATE sync_queue SET state = 'FAILED', attempts = :attempts, " +
            "next_attempt_at = :nextAttemptAt, last_error = :error, updated_at = :now WHERE id = :id",
    )
    suspend fun markFailed(
        id: Long,
        attempts: Int,
        nextAttemptAt: Long,
        error: String?,
        now: Long,
    )

    @Query("DELETE FROM sync_queue WHERE state = 'SYNCED' AND updated_at < :olderThan")
    suspend fun deleteSynced(olderThan: Long)

    @Query("UPDATE sync_queue SET state = 'PENDING', updated_at = :now WHERE state = 'SYNCING'")
    suspend fun resetSyncing(now: Long)

    @Query("SELECT COUNT(*) FROM sync_queue WHERE state IN ('PENDING','SYNCING','FAILED')")
    suspend fun countUnsynced(): Int

    @Query("DELETE FROM sync_queue")
    suspend fun clearAll()
}
