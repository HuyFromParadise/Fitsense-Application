package com.fitsensemobile.database

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.fitsensemobile.common.TimeUtils
import com.fitsensemobile.database.entity.LocalActivityEntity
import com.fitsensemobile.database.entity.LocalExerciseEntity
import com.fitsensemobile.database.entity.LocalGpsPointEntity
import kotlinx.coroutines.runBlocking
import java.util.concurrent.Executors

/**
 * Cầu nối JS -> Room. Tên module "LocalDb" khớp `FitSenseNative.LocalDb`.
 * Ngày 1 đọc/ghi bảng thật; các bảng của A chỉ đọc qua khung.
 */
class LocalDbModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    private val db by lazy { FitSenseDatabase.getInstance(context) }
    private val executor = Executors.newSingleThreadExecutor()

    override fun getName(): String = "LocalDb"

    @ReactMethod
    fun getTodayActivity(promise: Promise) {
        executor.execute {
            runBlocking {
                runCatching { db.localActivityDao().getByDate(TimeUtils.todayIso()) }
                    .onSuccess { promise.resolve(it?.toWritableMap()) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    @ReactMethod
    fun upsertTodayActivity(row: ReadableMap, promise: Promise) {
        executor.execute {
            runBlocking {
                runCatching {
                    db.localActivityDao().upsert(
                        LocalActivityEntity(
                            activityDate = row.getString("date") ?: TimeUtils.todayIso(),
                            timezoneId = row.getString("timezoneId") ?: TimeUtils.timeZoneId(),
                            steps = row.getIntOrZero("steps"),
                            distanceM = row.getDoubleOrZero("distanceM"),
                            calories = row.getDoubleOrZero("calories"),
                            activeMinutes = row.getIntOrZero("activeMinutes"),
                            updatedAt = row.getLongOrNow("updatedAtMs"),
                            syncState = row.getString("syncState") ?: "PENDING",
                        ),
                    )
                }
                    .onSuccess { promise.resolve(null) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    @ReactMethod
    fun getLocalExercises(limit: Double, offset: Double, promise: Promise) {
        executor.execute {
            runBlocking {
                runCatching {
                    db.localExerciseDao()
                        .getPage(limit.toInt(), offset.toInt())
                        .map { it.toWritableMap() }
                        .toWritableArray()
                }
                    .onSuccess { promise.resolve(it) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    @ReactMethod
    fun getLocalExercisePoints(sessionId: String, promise: Promise) {
        executor.execute {
            runBlocking {
                runCatching {
                    db.localGpsPointDao()
                        .getBySession(sessionId)
                        .map { it.toWritableMap() }
                        .toWritableArray()
                }
                    .onSuccess { promise.resolve(it) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    private fun ReadableMap.getIntOrZero(key: String): Int =
        if (hasKey(key) && !isNull(key)) getDouble(key).toInt() else 0

    private fun ReadableMap.getDoubleOrZero(key: String): Double =
        if (hasKey(key) && !isNull(key)) getDouble(key) else 0.0

    private fun ReadableMap.getLongOrNow(key: String): Long =
        if (hasKey(key) && !isNull(key)) getDouble(key).toLong() else TimeUtils.nowMs()

    private fun List<WritableMap>.toWritableArray(): WritableArray =
        Arguments.createArray().also { array -> forEach { array.pushMap(it) } }

    private fun LocalActivityEntity.toWritableMap(): WritableMap =
        Arguments.createMap().apply {
            putString("date", activityDate)
            putString("timezoneId", timezoneId)
            putInt("steps", steps)
            putDouble("distanceM", distanceM)
            putDouble("calories", calories)
            putInt("activeMinutes", activeMinutes)
            putDouble("updatedAtMs", updatedAt.toDouble())
            putString("syncState", syncState)
        }

    private fun LocalExerciseEntity.toWritableMap(): WritableMap =
        Arguments.createMap().apply {
            putString("id", id)
            putString("type", type)
            putString("status", status)
            putDouble("startedAtMs", startedAt.toDouble())
            if (endedAt == null) putNull("endedAtMs") else putDouble("endedAtMs", endedAt.toDouble())
            putDouble("pausedTotalMs", pausedTotalMs.toDouble())
            putInt("pointCount", pointCount)
            putDouble("distanceM", distanceM)
            putInt("durationSeconds", durationSeconds)
            putDouble("calories", calories)
            putDouble("updatedAtMs", updatedAt.toDouble())
            putString("syncState", syncState)
        }

    private fun LocalGpsPointEntity.toWritableMap(): WritableMap =
        Arguments.createMap().apply {
            putInt("seq", seq)
            putDouble("latitude", latitude)
            putDouble("longitude", longitude)
            if (altitudeM == null) putNull("altitudeM") else putDouble("altitudeM", altitudeM)
            if (speedMps == null) putNull("speedMps") else putDouble("speedMps", speedMps)
            if (accuracyM == null) putNull("accuracyM") else putDouble("accuracyM", accuracyM)
            putDouble("recordedAtMs", recordedAt.toDouble())
        }
}
