package com.fitsensemobile.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fitsensemobile.database.entity.SyncQueueEntity

/** Chủ: B (F8). */
@Dao
interface SyncQueueDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun enqueue(entity: SyncQueueEntity): Long

    @Query("SELECT * FROM sync_queue WHERE state = 'PENDING' ORDER BY created_at ASC LIMIT :limit")
    suspend fun getPending(limit: Int): List<SyncQueueEntity>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE state = 'PENDING'")
    suspend fun countPending(): Int

    @Query("UPDATE sync_queue SET state = :state, attempts = :attempts, last_error = :lastError, updated_at = :updatedAt WHERE id = :id")
    suspend fun updateState(id: Long, state: String, attempts: Int, lastError: String?, updatedAt: Long)
}
