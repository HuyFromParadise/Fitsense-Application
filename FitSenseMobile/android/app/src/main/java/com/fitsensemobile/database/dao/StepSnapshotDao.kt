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

    @Query("SELECT * FROM step_snapshots ORDER BY date DESC LIMIT 1")
    suspend fun getLatest(): StepSnapshotEntity?

    @Query("SELECT * FROM step_snapshots WHERE date BETWEEN :fromDate AND :toDate ORDER BY date ASC")
    suspend fun getRange(fromDate: String, toDate: String): List<StepSnapshotEntity>

    @Upsert
    suspend fun upsert(entity: StepSnapshotEntity)

    @Upsert
    suspend fun upsertAll(entities: List<StepSnapshotEntity>)
}
