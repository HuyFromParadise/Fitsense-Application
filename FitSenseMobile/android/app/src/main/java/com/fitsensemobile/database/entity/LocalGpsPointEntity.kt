package com.fitsensemobile.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/** Chủ: A (F2). */
@Entity(
    tableName = "local_gps_points",
    foreignKeys = [
        ForeignKey(
            entity = LocalExerciseEntity::class,
            parentColumns = ["id"],
            childColumns = ["session_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["session_id", "seq"], unique = true)],
)
data class LocalGpsPointEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    @ColumnInfo(name = "session_id")
    val sessionId: String,
    val seq: Int,
    val latitude: Double,
    val longitude: Double,
    @ColumnInfo(name = "altitude_m")
    val altitudeM: Double?,
    @ColumnInfo(name = "speed_mps")
    val speedMps: Double?,
    @ColumnInfo(name = "accuracy_m")
    val accuracyM: Double?,
    @ColumnInfo(name = "recorded_at")
    val recordedAt: Long,
    val synced: Boolean,
)
