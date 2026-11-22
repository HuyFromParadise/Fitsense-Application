package com.fitsensemobile.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fitsensemobile.database.entity.LocalGpsPointEntity

/** Chủ: A (F2). Khung cho B đọc. */
@Dao
interface LocalGpsPointDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(points: List<LocalGpsPointEntity>)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIgnore(point: LocalGpsPointEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAllIgnore(points: List<LocalGpsPointEntity>)

    @Query("SELECT * FROM local_gps_points WHERE session_id = :sessionId ORDER BY seq ASC")
    suspend fun getBySession(sessionId: String): List<LocalGpsPointEntity>

    @Query("UPDATE local_gps_points SET synced = 1 WHERE session_id = :sessionId")
    suspend fun markSyncedBySession(sessionId: String)
}
