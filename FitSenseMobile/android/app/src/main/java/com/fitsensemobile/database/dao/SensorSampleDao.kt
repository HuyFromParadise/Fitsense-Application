package com.fitsensemobile.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.fitsensemobile.database.entity.SensorSampleEntity

/** Chủ: B (F6). */
@Dao
interface SensorSampleDao {

    @Insert
    suspend fun insert(sample: SensorSampleEntity)

    @Query("SELECT * FROM sensor_samples WHERE recorded_at BETWEEN :fromMs AND :toMs ORDER BY recorded_at ASC")
    suspend fun getRange(fromMs: Long, toMs: Long): List<SensorSampleEntity>
}
