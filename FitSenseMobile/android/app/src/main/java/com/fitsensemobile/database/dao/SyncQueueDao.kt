package com.fitsensemobile.database.dao

import androidx.room.Dao
import androidx.room.Query
import com.fitsensemobile.database.entity.SyncQueueEntity

/** Chủ: B (F8). */
@Dao
interface SyncQueueDao {

    /**
     * Upsert theo unique index (entity_type, client_id): enqueue lại cùng ngày
     * cập nhật payload và đưa row về PENDING. Dùng REPLACE thay `ON CONFLICT DO UPDATE`
     * vì upsert kiểu đó cần SQLite 3.24 (Android 11) trong khi minSdk là 24.
     */
    @Query(
        """
        INSERT OR REPLACE INTO sync_queue
          (entity_type, client_id, operation, payload, state, attempts, next_attempt_at, last_error, created_at, updated_at)
        VALUES (:entityType, :clientId, :operation, :payload, 'PENDING', 0, :now, NULL, :now, :now)
        """,
    )
    suspend fun enqueue(
        entityType: String,
        clientId: String,
        operation: String,
        payload: String,
        now: Long,
    )

    // FAILED vẫn phải due lại sau backoff; item bị REJECTED có next_attempt_at = MAX nên không lọt.
    @Query(
        "SELECT * FROM sync_queue WHERE entity_type = :entityType " +
            "AND state IN ('PENDING','FAILED') AND next_attempt_at <= :now " +
            "ORDER BY created_at ASC LIMIT :limit",
    )
    suspend fun getDue(entityType: String, now: Long, limit: Int): List<SyncQueueEntity>

    @Query("UPDATE sync_queue SET state = 'SYNCING', updated_at = :now WHERE id IN (:ids)")
    suspend fun markSyncing(ids: List<Long>, now: Long)

    @Query(
        "UPDATE sync_queue SET state = 'SYNCED', attempts = 0, last_error = NULL, " +
            "updated_at = :now WHERE id IN (:ids) AND state = 'SYNCING'",
    )
    suspend fun markSynced(ids: List<Long>, now: Long)

    @Query(
        "UPDATE sync_queue SET state = 'FAILED', attempts = :attempts, " +
            "next_attempt_at = :nextAttemptAt, last_error = :error, updated_at = :now " +
            "WHERE id = :id AND state = 'SYNCING'",
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

    /** "Thử lại" thủ công: FAILED (kể cả REJECTED đã đẩy next_attempt_at = MAX) về PENDING ngay. */
    @Query(
        "UPDATE sync_queue SET state = 'PENDING', attempts = 0, next_attempt_at = :now, " +
            "last_error = NULL, updated_at = :now WHERE state = 'FAILED'",
    )
    suspend fun resetForRetry(now: Long)

    @Query("SELECT COUNT(*) FROM sync_queue WHERE state IN ('PENDING','SYNCING','FAILED')")
    suspend fun countUnsynced(): Int

    @Query("DELETE FROM sync_queue")
    suspend fun clearAll()
}
