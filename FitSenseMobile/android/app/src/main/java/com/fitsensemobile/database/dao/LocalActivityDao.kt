package com.fitsensemobile.database.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.fitsensemobile.database.entity.LocalActivityEntity

/** Chủ: B (F5). */
@Dao
interface LocalActivityDao {

    @Query("SELECT * FROM local_activity WHERE activity_date = :date LIMIT 1")
    suspend fun getByDate(date: String): LocalActivityEntity?

    @Upsert
    suspend fun upsert(entity: LocalActivityEntity)

    @Query(
        "SELECT * FROM local_activity ORDER BY activity_date DESC LIMIT :limit OFFSET :offset",
    )
    suspend fun getRange(limit: Int, offset: Int): List<LocalActivityEntity>

    /**
     * F8: nguồn backfill — mọi ngày chưa được server xác nhận và chưa có row trong
     * queue. Ngày đã có row (kể cả FAILED chờ backoff) không được enqueue lại, vì
     * upsert sẽ reset attempts/next_attempt_at và phá backoff.
     */
    @Query(
        "SELECT * FROM local_activity WHERE sync_state != 'SYNCED' " +
            "AND NOT EXISTS (SELECT 1 FROM sync_queue q WHERE q.entity_type = 'DAILY_ACTIVITY' " +
            "AND q.client_id = local_activity.activity_date || '|' || local_activity.timezone_id) " +
            "ORDER BY activity_date ASC LIMIT :limit",
    )
    suspend fun getUnsynced(limit: Int): List<LocalActivityEntity>

    @Query("UPDATE local_activity SET sync_state = :state WHERE activity_date = :date")
    suspend fun markSyncState(date: String, state: String)

    @Query("DELETE FROM local_activity")
    suspend fun clearAll()
}
