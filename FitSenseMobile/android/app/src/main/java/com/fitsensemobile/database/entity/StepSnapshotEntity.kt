package com.fitsensemobile.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/** Chủ: B (F5). Chốt ngày trước, chống đếm trùng/reboot. */
@Entity(tableName = "step_snapshots")
data class StepSnapshotEntity(
    @PrimaryKey
    val date: String,
    @ColumnInfo(name = "timezone_id")
    val timezoneId: String,
    @ColumnInfo(name = "baseline_counter")
    val baselineCounter: Long,
    @ColumnInfo(name = "last_counter")
    val lastCounter: Long,
    val steps: Int,
    @ColumnInfo(name = "boot_count")
    val bootCount: Int,
    @ColumnInfo(name = "updated_at")
    val updatedAt: Long,
)
