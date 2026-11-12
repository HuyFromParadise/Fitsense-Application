package com.fitsensemobile.location

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID

class ExerciseModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ExerciseServiceListener {

    private val dbHelper by lazy { ExerciseLocalDbHelper.getInstance(reactContext) }
    private var listenerCount = 0

    init {
        LocationForegroundService.currentListener = this
    }

    override fun getName(): String = "ExerciseModule"

    @ReactMethod
    fun addListener(eventName: String) {
        listenerCount++
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        listenerCount = (listenerCount - count).coerceAtLeast(0)
    }

    @ReactMethod
    fun start(type: String, promise: Promise) {
        try {
            if (!hasLocationPermission()) {
                promise.reject("PERMISSION_DENIED", "Location permission is required to start GPS exercise")
                return
            }

            val existing = dbHelper.getActiveSession()
            if (existing != null) {
                // Resume existing active session if already running or abandoned
                val intent = Intent(reactContext, LocationForegroundService::class.java).apply {
                    action = LocationForegroundService.ACTION_START
                    putExtra(LocationForegroundService.EXTRA_SESSION_ID, existing.id)
                    putExtra(LocationForegroundService.EXTRA_EXERCISE_TYPE, existing.type)
                }
                startForegroundServiceCompat(intent)
                promise.resolve(toActiveSessionMap(existing))
                return
            }

            val normalizedType = when (type.uppercase()) {
                "WALKING", "RUNNING", "CYCLING" -> type.uppercase()
                else -> "RUNNING"
            }

            val sessionId = UUID.randomUUID().toString()
            val nowMs = System.currentTimeMillis()
            dbHelper.insertSession(sessionId, normalizedType, nowMs)

            val intent = Intent(reactContext, LocationForegroundService::class.java).apply {
                action = LocationForegroundService.ACTION_START
                putExtra(LocationForegroundService.EXTRA_SESSION_ID, sessionId)
                putExtra(LocationForegroundService.EXTRA_EXERCISE_TYPE, normalizedType)
            }
            startForegroundServiceCompat(intent)

            val created = dbHelper.getSessionById(sessionId)!!
            promise.resolve(toActiveSessionMap(created))
        } catch (ex: Exception) {
            promise.reject("UNKNOWN", ex.message, ex)
        }
    }

    @ReactMethod
    fun pause(promise: Promise) {
        try {
            val active = dbHelper.getActiveSession()
            if (active == null) {
                promise.reject("INVALID_STATE", "No active exercise session to pause")
                return
            }
            val intent = Intent(reactContext, LocationForegroundService::class.java).apply {
                action = LocationForegroundService.ACTION_PAUSE
            }
            reactContext.startService(intent)
            promise.resolve(toActiveSessionMap(active.copy(status = "PAUSED")))
        } catch (ex: Exception) {
            promise.reject("UNKNOWN", ex.message, ex)
        }
    }

    @ReactMethod
    fun resume(promise: Promise) {
        try {
            val active = dbHelper.getActiveSession()
            if (active == null) {
                promise.reject("INVALID_STATE", "No paused exercise session to resume")
                return
            }
            val intent = Intent(reactContext, LocationForegroundService::class.java).apply {
                action = LocationForegroundService.ACTION_RESUME
            }
            startForegroundServiceCompat(intent)
            promise.resolve(toActiveSessionMap(active.copy(status = "ACTIVE")))
        } catch (ex: Exception) {
            promise.reject("UNKNOWN", ex.message, ex)
        }
    }

    @ReactMethod
    fun finish(promise: Promise) {
        try {
            val active = dbHelper.getActiveSession()
            if (active == null) {
                promise.reject("INVALID_STATE", "No active exercise session to finish")
                return
            }
            val intent = Intent(reactContext, LocationForegroundService::class.java).apply {
                action = LocationForegroundService.ACTION_FINISH
            }
            reactContext.startService(intent)

            // Wait briefly or return finalized snapshot directly
            val nowMs = System.currentTimeMillis()
            val durationSec = ((nowMs - active.startedAtMs - active.pausedTotalMs).coerceAtLeast(0L) / 1000L).toInt()
            val finishedRecord = active.copy(
                status = "FINISHED",
                endedAtMs = nowMs,
                durationSeconds = durationSec
            )
            // Ensure SQLite reflects FINISHED even if service hadn't handled stop yet
            if (!LocationForegroundService.isRunning) {
                dbHelper.updateSessionProgress(
                    id = active.id,
                    status = "FINISHED",
                    endedAtMs = nowMs,
                    pausedTotalMs = active.pausedTotalMs,
                    distanceM = active.distanceM,
                    durationSeconds = durationSec,
                    calories = active.calories,
                    avgPaceSecPerKm = active.avgPaceSecPerKm,
                    pointCount = active.pointCount,
                    syncState = "PENDING"
                )
            }
            promise.resolve(toActiveSessionMap(finishedRecord))
        } catch (ex: Exception) {
            promise.reject("UNKNOWN", ex.message, ex)
        }
    }

    @ReactMethod
    fun getActiveSession(promise: Promise) {
        try {
            val active = dbHelper.getActiveSession()
            if (active == null) {
                promise.resolve(null)
            } else {
                promise.resolve(toActiveSessionMap(active))
            }
        } catch (ex: Exception) {
            promise.reject("DATABASE_ERROR", ex.message, ex)
        }
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            val map = Arguments.createMap().apply {
                putString("status", LocationForegroundService.currentStatus)
                putString("foregroundServiceType", "location")
            }
            promise.resolve(map)
        } catch (ex: Exception) {
            promise.reject("UNKNOWN", ex.message, ex)
        }
    }

    @ReactMethod
    fun getLocalExercises(limit: Int, offset: Int, promise: Promise) {
        try {
            val rows = dbHelper.getLocalExercises(limit, offset)
            val array = Arguments.createArray()
            for (row in rows) {
                array.pushMap(toLocalExerciseMap(row))
            }
            promise.resolve(array)
        } catch (ex: Exception) {
            promise.reject("DATABASE_ERROR", ex.message, ex)
        }
    }

    @ReactMethod
    fun getLocalExercisePoints(sessionId: String, promise: Promise) {
        try {
            val points = dbHelper.getSessionPoints(sessionId)
            val array = Arguments.createArray()
            for (p in points) {
                array.pushMap(toPointMap(p))
            }
            promise.resolve(array)
        } catch (ex: Exception) {
            promise.reject("DATABASE_ERROR", ex.message, ex)
        }
    }

    @ReactMethod
    fun getPendingSyncExercises(limit: Int, promise: Promise) {
        try {
            val rows = dbHelper.getPendingSyncSessions(limit)
            val array = Arguments.createArray()
            for (row in rows) {
                array.pushMap(toLocalExerciseMap(row))
            }
            promise.resolve(array)
        } catch (ex: Exception) {
            promise.reject("DATABASE_ERROR", ex.message, ex)
        }
    }

    @ReactMethod
    fun markSessionSynced(sessionId: String, promise: Promise) {
        try {
            dbHelper.markSessionSynced(sessionId)
            promise.resolve(true)
        } catch (ex: Exception) {
            promise.reject("DATABASE_ERROR", ex.message, ex)
        }
    }

    override fun onStateChanged(state: String, record: LocalExerciseRecord) {
        val payload = Arguments.createMap().apply {
            putString("state", state)
            putMap("session", toActiveSessionMap(record))
        }
        emitEvent("EXERCISE_STATE", payload)
    }

    override fun onPointRecorded(point: LocalGpsPointRecord, distanceM: Double) {
        val payload = Arguments.createMap().apply {
            putString("state", "POINT_RECORDED")
            putMap("point", toPointMap(point))
            putDouble("distanceM", distanceM)
        }
        emitEvent("EXERCISE_STATE", payload)
    }

    private fun emitEvent(eventName: String, params: WritableMap) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    private fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            reactContext, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            reactContext, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    private fun startForegroundServiceCompat(intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    private fun toActiveSessionMap(r: LocalExerciseRecord): WritableMap {
        return Arguments.createMap().apply {
            putString("sessionId", r.id)
            putString("type", r.type)
            putString("status", r.status)
            putDouble("startedAtMs", r.startedAtMs.toDouble())
            putDouble("pausedTotalMs", r.pausedTotalMs.toDouble())
            putInt("pointCount", r.pointCount)
            putDouble("distanceM", r.distanceM)
        }
    }

    private fun toLocalExerciseMap(r: LocalExerciseRecord): WritableMap {
        return Arguments.createMap().apply {
            putString("id", r.id)
            putString("type", r.type)
            putString("status", r.status)
            putDouble("startedAtMs", r.startedAtMs.toDouble())
            if (r.endedAtMs != null) putDouble("endedAtMs", r.endedAtMs.toDouble()) else putNull("endedAtMs")
            putDouble("pausedTotalMs", r.pausedTotalMs.toDouble())
            putInt("pointCount", r.pointCount)
            putDouble("distanceM", r.distanceM)
            putInt("durationSeconds", r.durationSeconds)
            putDouble("calories", r.calories)
            putDouble("updatedAtMs", r.updatedAtMs.toDouble())
            putString("syncState", r.syncState)
        }
    }

    private fun toPointMap(p: LocalGpsPointRecord): WritableMap {
        return Arguments.createMap().apply {
            putInt("seq", p.seq)
            putDouble("latitude", p.latitude)
            putDouble("longitude", p.longitude)
            if (p.altitudeM != null) putDouble("altitudeM", p.altitudeM) else putNull("altitudeM")
            if (p.speedMps != null) putDouble("speedMps", p.speedMps) else putNull("speedMps")
            if (p.accuracyM != null) putDouble("accuracyM", p.accuracyM) else putNull("accuracyM")
            putDouble("recordedAtMs", p.recordedAtMs.toDouble())
        }
    }
}
