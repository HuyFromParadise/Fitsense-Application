package com.fitsensemobile.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/** Chủ: B (F5). Nguồn của Zustand `useTodayActivity`. */
@Entity(tableName = "local_activity")
data class LocalActivityEntity(
    @PrimaryKey
    @ColumnInfo(name = "activity_date")
    val activityDate: String,
    @ColumnInfo(name = "timezone_id")
    val timezoneId: String,
    val steps: Int,
    @ColumnInfo(name = "distance_m")
    val distanceM: Double,
    val calories: Double,
    @ColumnInfo(name = "active_minutes")
    val activeMinutes: Int,
    @ColumnInfo(name = "updated_at")
    val updatedAt: Long,
    @ColumnInfo(name = "sync_state")
    val syncState: String,
)
