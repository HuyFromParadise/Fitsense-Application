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
}
