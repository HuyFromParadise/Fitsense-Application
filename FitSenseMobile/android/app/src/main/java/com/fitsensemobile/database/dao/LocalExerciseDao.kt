package com.fitsensemobile.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fitsensemobile.database.entity.LocalExerciseEntity

/** Chủ: A (F2). Khung cho B đọc. */
@Dao
interface LocalExerciseDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: LocalExerciseEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIgnore(entity: LocalExerciseEntity)

    @Query("SELECT * FROM local_exercise WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): LocalExerciseEntity?

    @Query("SELECT * FROM local_exercise ORDER BY started_at DESC LIMIT :limit OFFSET :offset")
    suspend fun getPage(limit: Int, offset: Int): List<LocalExerciseEntity>

    @Query("SELECT * FROM local_exercise WHERE status IN ('ACTIVE', 'PAUSED') ORDER BY started_at DESC LIMIT 1")
    suspend fun getActiveSession(): LocalExerciseEntity?

    @Query("SELECT * FROM local_exercise WHERE status = 'FINISHED' AND sync_state IN ('PENDING', 'FAILED') ORDER BY started_at ASC LIMIT :limit")
    suspend fun getPendingSync(limit: Int): List<LocalExerciseEntity>

    @Query(
        """
        UPDATE local_exercise
        SET status = :status,
            ended_at = :endedAt,
            paused_total_ms = :pausedTotalMs,
            distance_m = :distanceM,
            duration_seconds = :durationSeconds,
            calories = :calories,
            avg_pace_sec_per_km = :avgPaceSecPerKm,
            point_count = :pointCount,
            updated_at = :updatedAt,
            sync_state = :syncState
        WHERE id = :id
        """
    )
    suspend fun updateProgress(
        id: String,
        status: String,
        endedAt: Long?,
        pausedTotalMs: Long,
        distanceM: Double,
        durationSeconds: Int,
        calories: Double,
        avgPaceSecPerKm: Double?,
        pointCount: Int,
        updatedAt: Long,
        syncState: String,
    )

    @Query("UPDATE local_exercise SET sync_state = :syncState, updated_at = :updatedAt WHERE id = :id")
    suspend fun markSyncState(id: String, syncState: String, updatedAt: Long)

    @Query("SELECT COUNT(*) FROM local_exercise WHERE started_at BETWEEN :fromMs AND :toMs")
    suspend fun countBetween(fromMs: Long, toMs: Long): Int

    @Query("DELETE FROM local_exercise")
    suspend fun clearAll()
}
