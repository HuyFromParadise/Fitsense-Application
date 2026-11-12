package com.fitsensemobile.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** Chủ: B (F6). Chỉ ghi khi bật chế độ thu mẫu. */
@Entity(
    tableName = "sensor_samples",
    indices = [Index(value = ["recorded_at"])],
)
data class SensorSampleEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val type: String,
    val x: Double,
    val y: Double,
    val z: Double,
    val magnitude: Double,
    val label: String,
    @ColumnInfo(name = "recorded_at")
    val recordedAt: Long,
)
