package com.fitsensemobile.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** Chủ: B (F8). Unique (entity_type, client_id): một bản ghi không xếp hàng hai lần. */
@Entity(
    tableName = "sync_queue",
    indices = [Index(value = ["entity_type", "client_id"], unique = true)],
)
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    @ColumnInfo(name = "entity_type")
    val entityType: String,
    @ColumnInfo(name = "client_id")
    val clientId: String,
    val operation: String,
    val payload: String,
    val state: String,
    val attempts: Int,
    @ColumnInfo(name = "next_attempt_at")
    val nextAttemptAt: Long,
    @ColumnInfo(name = "last_error")
    val lastError: String?,
    @ColumnInfo(name = "created_at")
    val createdAt: Long,
    @ColumnInfo(name = "updated_at")
    val updatedAt: Long,
)
