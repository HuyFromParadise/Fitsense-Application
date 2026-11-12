package com.fitsensemobile.location

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class LocalExerciseRecord(
    val id: String,
    val type: String,
    val status: String,
    val startedAtMs: Long,
    val endedAtMs: Long?,
    val pausedTotalMs: Long,
    val distanceM: Double,
    val durationSeconds: Int,
    val calories: Double,
    val avgPaceSecPerKm: Double?,
    val pointCount: Int,
    val updatedAtMs: Long,
    val syncState: String
)

data class LocalGpsPointRecord(
    val seq: Int,
    val latitude: Double,
    val longitude: Double,
    val altitudeM: Double?,
    val speedMps: Double?,
    val accuracyM: Double?,
    val recordedAtMs: Long
)

class ExerciseLocalDbHelper(context: Context) :
    SQLiteOpenHelper(context.applicationContext, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "fitsense_exercise.db"
        private const val DATABASE_VERSION = 1

        @Volatile
        private var instance: ExerciseLocalDbHelper? = null

        fun getInstance(context: Context): ExerciseLocalDbHelper {
            return instance ?: synchronized(this) {
                instance ?: ExerciseLocalDbHelper(context).also { instance = it }
            }
        }
    }

    override fun onConfigure(db: SQLiteDatabase) {
        super.onConfigure(db)
        db.setForeignKeyConstraintsEnabled(true)
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS local_exercise (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                paused_total_ms INTEGER NOT NULL DEFAULT 0,
                distance_m REAL NOT NULL DEFAULT 0,
                duration_seconds INTEGER NOT NULL DEFAULT 0,
                calories REAL NOT NULL DEFAULT 0,
                avg_pace_sec_per_km REAL,
                point_count INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL,
                sync_state TEXT NOT NULL DEFAULT 'PENDING'
            )
            """.trimIndent()
        )

        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS local_gps_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                seq INTEGER NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                altitude_m REAL,
                speed_mps REAL,
                accuracy_m REAL,
                recorded_at INTEGER NOT NULL,
                synced INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (session_id) REFERENCES local_exercise(id) ON DELETE CASCADE
            )
            """.trimIndent()
        )

        db.execSQL(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_gps_session_seq ON local_gps_points(session_id, seq)"
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Future migrations here
    }

    fun insertSession(id: String, type: String, startedAtMs: Long) {
        val values = ContentValues().apply {
            put("id", id)
            put("type", type)
            put("status", "ACTIVE")
            put("started_at", startedAtMs)
            put("paused_total_ms", 0L)
            put("distance_m", 0.0)
            put("duration_seconds", 0)
            put("calories", 0.0)
            put("point_count", 0)
            put("updated_at", startedAtMs)
            put("sync_state", "PENDING")
        }
        writableDatabase.insertWithOnConflict("local_exercise", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun updateSessionProgress(
        id: String,
        status: String,
        endedAtMs: Long?,
        pausedTotalMs: Long,
        distanceM: Double,
        durationSeconds: Int,
        calories: Double,
        avgPaceSecPerKm: Double?,
        pointCount: Int,
        syncState: String = "PENDING"
    ) {
        val values = ContentValues().apply {
            put("status", status)
            if (endedAtMs != null) put("ended_at", endedAtMs) else putNull("ended_at")
            put("paused_total_ms", pausedTotalMs)
            put("distance_m", distanceM)
            put("duration_seconds", durationSeconds)
            put("calories", calories)
            if (avgPaceSecPerKm != null) put("avg_pace_sec_per_km", avgPaceSecPerKm) else putNull("avg_pace_sec_per_km")
            put("point_count", pointCount)
            put("updated_at", System.currentTimeMillis())
            put("sync_state", syncState)
        }
        writableDatabase.update("local_exercise", values, "id = ?", arrayOf(id))
    }

    fun insertGpsPoint(sessionId: String, point: LocalGpsPointRecord) {
        val values = ContentValues().apply {
            put("session_id", sessionId)
            put("seq", point.seq)
            put("latitude", point.latitude)
            put("longitude", point.longitude)
            if (point.altitudeM != null) put("altitude_m", point.altitudeM) else putNull("altitude_m")
            if (point.speedMps != null) put("speed_mps", point.speedMps) else putNull("speed_mps")
            if (point.accuracyM != null) put("accuracy_m", point.accuracyM) else putNull("accuracy_m")
            put("recorded_at", point.recordedAtMs)
            put("synced", 0)
        }
        writableDatabase.insertWithOnConflict("local_gps_points", null, values, SQLiteDatabase.CONFLICT_IGNORE)
    }

    fun getActiveSession(): LocalExerciseRecord? {
        val cursor = readableDatabase.rawQuery(
            "SELECT * FROM local_exercise WHERE status IN ('ACTIVE', 'PAUSED') ORDER BY started_at DESC LIMIT 1",
            null
        )
        cursor.use {
            if (it.moveToFirst()) {
                return readExerciseRow(it)
            }
        }
        return null
    }

    fun getSessionById(sessionId: String): LocalExerciseRecord? {
        val cursor = readableDatabase.rawQuery(
            "SELECT * FROM local_exercise WHERE id = ? LIMIT 1",
            arrayOf(sessionId)
        )
        cursor.use {
            if (it.moveToFirst()) {
                return readExerciseRow(it)
            }
        }
        return null
    }

    fun getLocalExercises(limit: Int, offset: Int): List<LocalExerciseRecord> {
        val result = mutableListOf<LocalExerciseRecord>()
        val cursor = readableDatabase.rawQuery(
            "SELECT * FROM local_exercise ORDER BY started_at DESC LIMIT ? OFFSET ?",
            arrayOf(limit.toString(), offset.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                result.add(readExerciseRow(it))
            }
        }
        return result
    }

    fun getSessionPoints(sessionId: String): List<LocalGpsPointRecord> {
        val result = mutableListOf<LocalGpsPointRecord>()
        val cursor = readableDatabase.rawQuery(
            "SELECT seq, latitude, longitude, altitude_m, speed_mps, accuracy_m, recorded_at FROM local_gps_points WHERE session_id = ? ORDER BY seq ASC",
            arrayOf(sessionId)
        )
        cursor.use {
            while (it.moveToNext()) {
                result.add(
                    LocalGpsPointRecord(
                        seq = it.getInt(0),
                        latitude = it.getDouble(1),
                        longitude = it.getDouble(2),
                        altitudeM = if (it.isNull(3)) null else it.getDouble(3),
                        speedMps = if (it.isNull(4)) null else it.getDouble(4),
                        accuracyM = if (it.isNull(5)) null else it.getDouble(5),
                        recordedAtMs = it.getLong(6)
                    )
                )
            }
        }
        return result
    }

    fun getPendingSyncSessions(limit: Int = 20): List<LocalExerciseRecord> {
        val result = mutableListOf<LocalExerciseRecord>()
        val cursor = readableDatabase.rawQuery(
            "SELECT * FROM local_exercise WHERE status = 'FINISHED' AND sync_state IN ('PENDING', 'FAILED') ORDER BY started_at ASC LIMIT ?",
            arrayOf(limit.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                result.add(readExerciseRow(it))
            }
        }
        return result
    }

    fun markSessionSynced(sessionId: String) {
        val values = ContentValues().apply {
            put("sync_state", "SYNCED")
            put("updated_at", System.currentTimeMillis())
        }
        writableDatabase.update("local_exercise", values, "id = ?", arrayOf(sessionId))

        val pointValues = ContentValues().apply { put("synced", 1) }
        writableDatabase.update("local_gps_points", pointValues, "session_id = ?", arrayOf(sessionId))
    }

    private fun readExerciseRow(c: android.database.Cursor): LocalExerciseRecord {
        return LocalExerciseRecord(
            id = c.getString(c.getColumnIndexOrThrow("id")),
            type = c.getString(c.getColumnIndexOrThrow("type")),
            status = c.getString(c.getColumnIndexOrThrow("status")),
            startedAtMs = c.getLong(c.getColumnIndexOrThrow("started_at")),
            endedAtMs = c.getColumnIndexOrThrow("ended_at").let { if (c.isNull(it)) null else c.getLong(it) },
            pausedTotalMs = c.getLong(c.getColumnIndexOrThrow("paused_total_ms")),
            distanceM = c.getDouble(c.getColumnIndexOrThrow("distance_m")),
            durationSeconds = c.getInt(c.getColumnIndexOrThrow("duration_seconds")),
            calories = c.getDouble(c.getColumnIndexOrThrow("calories")),
            avgPaceSecPerKm = c.getColumnIndexOrThrow("avg_pace_sec_per_km").let { if (c.isNull(it)) null else c.getDouble(it) },
            pointCount = c.getInt(c.getColumnIndexOrThrow("point_count")),
            updatedAtMs = c.getLong(c.getColumnIndexOrThrow("updated_at")),
            syncState = c.getString(c.getColumnIndexOrThrow("sync_state"))
        )
    }
}
