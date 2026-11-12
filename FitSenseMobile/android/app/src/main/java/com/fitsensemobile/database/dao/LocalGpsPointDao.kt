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

    @Query("SELECT * FROM local_gps_points WHERE session_id = :sessionId ORDER BY seq ASC")
    suspend fun getBySession(sessionId: String): List<LocalGpsPointEntity>
}
