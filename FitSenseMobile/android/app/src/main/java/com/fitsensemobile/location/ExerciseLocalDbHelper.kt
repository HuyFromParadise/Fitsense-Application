package com.fitsensemobile.location

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import com.fitsensemobile.database.FitSenseDatabase
import com.fitsensemobile.database.entity.LocalExerciseEntity
import com.fitsensemobile.database.entity.LocalGpsPointEntity
import kotlinx.coroutines.runBlocking
import java.util.concurrent.Callable
import java.util.concurrent.Executors

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

/**
 * Thống nhất lưu buổi tập & GPS points vào Room `FitSenseDatabase` (`fitsense.db`)
 * trên thread riêng, đồng thời tự migrate dữ liệu cũ từ `fitsense_exercise.db` nếu còn tồn tại.
 */
class ExerciseLocalDbHelper private constructor(context: Context) {

    private val appContext = context.applicationContext
    private val db by lazy { FitSenseDatabase.getInstance(appContext) }
    private val executor = Executors.newSingleThreadExecutor()

    @Volatile
    private var migratedLegacy = false

    companion object {
        private const val LEGACY_DATABASE_NAME = "fitsense_exercise.db"

        @Volatile
        private var instance: ExerciseLocalDbHelper? = null

        fun getInstance(context: Context): ExerciseLocalDbHelper {
            return instance ?: synchronized(this) {
                instance ?: ExerciseLocalDbHelper(context).also { instance = it }
            }
        }
    }

    private fun <T> runOnDbThread(block: suspend () -> T): T {
        return executor.submit(Callable {
            runBlocking {
                migrateLegacyDatabaseIfNeeded()
                block()
            }
        }).get()
    }

    private suspend fun migrateLegacyDatabaseIfNeeded() {
        if (migratedLegacy) return
        migratedLegacy = true

        val legacyFile = appContext.getDatabasePath(LEGACY_DATABASE_NAME)
        if (!legacyFile.exists()) return

        val migrated = runCatching {
            val legacyDb = SQLiteDatabase.openDatabase(
                legacyFile.path,
                null,
                SQLiteDatabase.OPEN_READONLY,
            )
            legacyDb.use { sqlDb ->
                val exercises = mutableListOf<LocalExerciseEntity>()
                sqlDb.rawQuery("SELECT * FROM local_exercise", null).use { c ->
                    while (c.moveToNext()) {
                        val endedIdx = c.getColumnIndexOrThrow("ended_at")
                        val paceIdx = c.getColumnIndexOrThrow("avg_pace_sec_per_km")
                        exercises.add(
                            LocalExerciseEntity(
                                id = c.getString(c.getColumnIndexOrThrow("id")),
                                type = c.getString(c.getColumnIndexOrThrow("type")),
                                status = c.getString(c.getColumnIndexOrThrow("status")),
                                startedAt = c.getLong(c.getColumnIndexOrThrow("started_at")),
                                endedAt = if (c.isNull(endedIdx)) null else c.getLong(endedIdx),
                                pausedTotalMs = c.getLong(c.getColumnIndexOrThrow("paused_total_ms")),
                                distanceM = c.getDouble(c.getColumnIndexOrThrow("distance_m")),
                                durationSeconds = c.getInt(c.getColumnIndexOrThrow("duration_seconds")),
                                calories = c.getDouble(c.getColumnIndexOrThrow("calories")),
                                avgPaceSecPerKm = if (c.isNull(paceIdx)) null else c.getDouble(paceIdx),
                                pointCount = c.getInt(c.getColumnIndexOrThrow("point_count")),
                                updatedAt = c.getLong(c.getColumnIndexOrThrow("updated_at")),
                                syncState = c.getString(c.getColumnIndexOrThrow("sync_state")),
                            ),
                        )
                    }
                }
                for (ex in exercises) {
                    db.localExerciseDao().insertIgnore(ex)
                }

                val points = mutableListOf<LocalGpsPointEntity>()
                sqlDb.rawQuery(
                    "SELECT session_id, seq, latitude, longitude, altitude_m, speed_mps, accuracy_m, recorded_at, synced FROM local_gps_points",
                    null,
                ).use { c ->
                    while (c.moveToNext()) {
                        points.add(
                            LocalGpsPointEntity(
                                id = 0L,
                                sessionId = c.getString(0),
                                seq = c.getInt(1),
                                latitude = c.getDouble(2),
                                longitude = c.getDouble(3),
                                altitudeM = if (c.isNull(4)) null else c.getDouble(4),
                                speedMps = if (c.isNull(5)) null else c.getDouble(5),
                                accuracyM = if (c.isNull(6)) null else c.getDouble(6),
                                recordedAt = c.getLong(7),
                                synced = c.getInt(8) != 0,
                            ),
                        )
                    }
                }
                if (points.isNotEmpty()) {
                    db.localGpsPointDao().insertAllIgnore(points)
                }
            }
            true
        }.getOrDefault(false)

        if (migrated) {
            appContext.deleteDatabase(LEGACY_DATABASE_NAME)
        }
    }

    fun insertSession(id: String, type: String, startedAtMs: Long) {
        runOnDbThread {
            db.localExerciseDao().insert(
                LocalExerciseEntity(
                    id = id,
                    type = type,
                    status = "ACTIVE",
                    startedAt = startedAtMs,
                    endedAt = null,
                    pausedTotalMs = 0L,
                    distanceM = 0.0,
                    durationSeconds = 0,
                    calories = 0.0,
                    avgPaceSecPerKm = null,
                    pointCount = 0,
                    updatedAt = startedAtMs,
                    syncState = "PENDING",
                ),
            )
        }
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
        syncState: String = "PENDING",
    ) {
        runOnDbThread {
            db.localExerciseDao().updateProgress(
                id = id,
                status = status,
                endedAt = endedAtMs,
                pausedTotalMs = pausedTotalMs,
                distanceM = distanceM,
                durationSeconds = durationSeconds,
                calories = calories,
                avgPaceSecPerKm = avgPaceSecPerKm,
                pointCount = pointCount,
                updatedAt = System.currentTimeMillis(),
                syncState = syncState,
            )
        }
    }

    fun insertGpsPoint(sessionId: String, point: LocalGpsPointRecord) {
        runOnDbThread {
            db.localGpsPointDao().insertIgnore(
                LocalGpsPointEntity(
                    id = 0L,
                    sessionId = sessionId,
                    seq = point.seq,
                    latitude = point.latitude,
                    longitude = point.longitude,
                    altitudeM = point.altitudeM,
                    speedMps = point.speedMps,
                    accuracyM = point.accuracyM,
                    recordedAt = point.recordedAtMs,
                    synced = false,
                ),
            )
        }
    }

    fun getActiveSession(): LocalExerciseRecord? =
        runOnDbThread { db.localExerciseDao().getActiveSession()?.toRecord() }

    fun getSessionById(sessionId: String): LocalExerciseRecord? =
        runOnDbThread { db.localExerciseDao().getById(sessionId)?.toRecord() }

    fun getLocalExercises(limit: Int, offset: Int): List<LocalExerciseRecord> =
        runOnDbThread { db.localExerciseDao().getPage(limit, offset).map { it.toRecord() } }

    fun getSessionPoints(sessionId: String): List<LocalGpsPointRecord> =
        runOnDbThread { db.localGpsPointDao().getBySession(sessionId).map { it.toRecord() } }

    fun getPendingSyncSessions(limit: Int = 20): List<LocalExerciseRecord> =
        runOnDbThread { db.localExerciseDao().getPendingSync(limit).map { it.toRecord() } }

    fun markSessionSynced(sessionId: String) {
        runOnDbThread {
            db.localExerciseDao().markSyncState(sessionId, "SYNCED", System.currentTimeMillis())
            db.localGpsPointDao().markSyncedBySession(sessionId)
        }
    }

    fun clearAllExercises() {
        runOnDbThread {
            db.localExerciseDao().clearAll()
        }
    }

    private fun LocalExerciseEntity.toRecord() = LocalExerciseRecord(
        id = id,
        type = type,
        status = status,
        startedAtMs = startedAt,
        endedAtMs = endedAt,
        pausedTotalMs = pausedTotalMs,
        distanceM = distanceM,
        durationSeconds = durationSeconds,
        calories = calories,
        avgPaceSecPerKm = avgPaceSecPerKm,
        pointCount = pointCount,
        updatedAtMs = updatedAt,
        syncState = syncState,
    )

    private fun LocalGpsPointEntity.toRecord() = LocalGpsPointRecord(
        seq = seq,
        latitude = latitude,
        longitude = longitude,
        altitudeM = altitudeM,
        speedMps = speedMps,
        accuracyM = accuracyM,
        recordedAtMs = recordedAt,
    )
}
