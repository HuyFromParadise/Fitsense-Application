package com.fitsensemobile.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/** Chủ: A (F2). B đọc để đếm số buổi tập, không ghi. */
@Entity(tableName = "local_exercise")
data class LocalExerciseEntity(
    @PrimaryKey
    val id: String,
    val type: String,
    val status: String,
    @ColumnInfo(name = "started_at")
    val startedAt: Long,
    @ColumnInfo(name = "ended_at")
    val endedAt: Long?,
    @ColumnInfo(name = "paused_total_ms")
    val pausedTotalMs: Long,
    @ColumnInfo(name = "distance_m")
    val distanceM: Double,
    @ColumnInfo(name = "duration_seconds")
    val durationSeconds: Int,
    val calories: Double,
    @ColumnInfo(name = "avg_pace_sec_per_km")
    val avgPaceSecPerKm: Double?,
    @ColumnInfo(name = "point_count")
    val pointCount: Int,
    @ColumnInfo(name = "updated_at")
    val updatedAt: Long,
    @ColumnInfo(name = "sync_state")
    val syncState: String,
)
