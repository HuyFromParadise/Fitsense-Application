package com.fitsensemobile.database.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.fitsensemobile.database.entity.StepSnapshotEntity

/** Chủ: B (F5). */
@Dao
interface StepSnapshotDao {

    @Query("SELECT * FROM step_snapshots WHERE date = :date LIMIT 1")
    suspend fun getByDate(date: String): StepSnapshotEntity?

    @Upsert
    suspend fun upsert(entity: StepSnapshotEntity)
}
