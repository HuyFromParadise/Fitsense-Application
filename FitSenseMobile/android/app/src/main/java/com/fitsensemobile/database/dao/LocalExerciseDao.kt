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

    @Query("SELECT * FROM local_exercise WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): LocalExerciseEntity?

    @Query("SELECT * FROM local_exercise ORDER BY started_at DESC LIMIT :limit OFFSET :offset")
    suspend fun getPage(limit: Int, offset: Int): List<LocalExerciseEntity>

    @Query("SELECT COUNT(*) FROM local_exercise WHERE started_at BETWEEN :fromMs AND :toMs")
    suspend fun countBetween(fromMs: Long, toMs: Long): Int
}
