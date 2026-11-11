package com.fitsensemobile.location

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.fitsensemobile.MainActivity
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

interface ExerciseServiceListener {
    fun onStateChanged(state: String, record: LocalExerciseRecord)
    fun onPointRecorded(point: LocalGpsPointRecord, distanceM: Double)
}

class LocationForegroundService : Service(), LocationListener {

    companion object {
        const val ACTION_START = "com.fitsensemobile.location.START"
        const val ACTION_PAUSE = "com.fitsensemobile.location.PAUSE"
        const val ACTION_RESUME = "com.fitsensemobile.location.RESUME"
        const val ACTION_FINISH = "com.fitsensemobile.location.FINISH"

        const val EXTRA_SESSION_ID = "session_id"
        const val EXTRA_EXERCISE_TYPE = "exercise_type"

        private const val CHANNEL_ID = "fitsense_exercise_location"
        private const val NOTIFICATION_ID = 2001

        private const val MAX_ACCURACY_METERS = 35.0
        private const val MIN_DISTANCE_METERS = 2.0

        @Volatile
        var currentListener: ExerciseServiceListener? = null

        @Volatile
        var isRunning: Boolean = false
            private set

        @Volatile
        var currentStatus: String = "IDLE"
            private set
    }

    private lateinit var locationManager: LocationManager
    private lateinit var dbHelper: ExerciseLocalDbHelper

    private var activeSessionId: String? = null
    private var exerciseType: String = "RUNNING"
    private var startedAtMs: Long = 0L
    private var pauseStartedAtMs: Long? = null
    private var pausedTotalMs: Long = 0L
    private var totalDistanceM: Double = 0.0
    private var pointSeq: Int = 0
    private var lastValidLocation: Location? = null

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        dbHelper = ExerciseLocalDbHelper.getInstance(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val sessionId = intent.getStringExtra(EXTRA_SESSION_ID) ?: return START_NOT_STICKY
                val type = intent.getStringExtra(EXTRA_EXERCISE_TYPE) ?: "RUNNING"
                handleStart(sessionId, type)
            }
            ACTION_PAUSE -> handlePause()
            ACTION_RESUME -> handleResume()
            ACTION_FINISH -> handleFinish()
            null -> {
                // Service restarted by OS after kill; try recovering active session from SQLite
                val recovered = dbHelper.getActiveSession()
                if (recovered != null) {
                    restoreSessionState(recovered)
                    startForegroundCompat(buildNotification())
                    if (recovered.status == "ACTIVE") {
                        requestLocationUpdates()
                    }
                } else {
                    stopSelf()
                }
            }
        }
        return START_STICKY
    }

    private fun handleStart(sessionId: String, type: String) {
        val existing = dbHelper.getSessionById(sessionId)
        if (existing != null && existing.pointCount > 0) {
            restoreSessionState(existing)
        } else {
            activeSessionId = sessionId
            exerciseType = type
            startedAtMs = existing?.startedAtMs ?: System.currentTimeMillis()
            pauseStartedAtMs = null
            pausedTotalMs = 0L
            totalDistanceM = 0.0
            pointSeq = 0
            lastValidLocation = null
        }

        isRunning = true
        currentStatus = "ACTIVE"

        startForegroundCompat(buildNotification())
        requestLocationUpdates()

        dbHelper.getSessionById(sessionId)?.let {
            currentListener?.onStateChanged("STARTED", it)
        }
    }

    private fun restoreSessionState(record: LocalExerciseRecord) {
        activeSessionId = record.id
        exerciseType = record.type
        startedAtMs = record.startedAtMs
        pausedTotalMs = record.pausedTotalMs
        totalDistanceM = record.distanceM
        pointSeq = record.pointCount
        currentStatus = record.status
        isRunning = true

        val points = dbHelper.getSessionPoints(record.id)
        if (points.isNotEmpty()) {
            val last = points.last()
            lastValidLocation = Location("restored").apply {
                latitude = last.latitude
                longitude = last.longitude
                time = last.recordedAtMs
            }
        }
    }

    private fun handlePause() {
        val sessionId = activeSessionId ?: return
        if (currentStatus == "PAUSED") return

        currentStatus = "PAUSED"
        pauseStartedAtMs = System.currentTimeMillis()
        stopLocationUpdates()

        val durationSec = computeDurationSeconds(System.currentTimeMillis())
        val calories = computeCalories(durationSec)
        val avgPace = if (totalDistanceM > 0) durationSec / (totalDistanceM / 1000.0) else null

        dbHelper.updateSessionProgress(
            id = sessionId,
            status = "PAUSED",
            endedAtMs = null,
            pausedTotalMs = pausedTotalMs,
            distanceM = totalDistanceM,
            durationSeconds = durationSec,
            calories = calories,
            avgPaceSecPerKm = avgPace,
            pointCount = pointSeq
        )

        updateNotification()
        dbHelper.getSessionById(sessionId)?.let {
            currentListener?.onStateChanged("PAUSED", it)
        }
    }

    private fun handleResume() {
        val sessionId = activeSessionId ?: return
        if (currentStatus == "ACTIVE") return

        val now = System.currentTimeMillis()
        pauseStartedAtMs?.let { pausedAt ->
            pausedTotalMs += (now - pausedAt).coerceAtLeast(0L)
        }
        pauseStartedAtMs = null
        currentStatus = "ACTIVE"

        val durationSec = computeDurationSeconds(now)
        val calories = computeCalories(durationSec)
        val avgPace = if (totalDistanceM > 0) durationSec / (totalDistanceM / 1000.0) else null

        dbHelper.updateSessionProgress(
            id = sessionId,
            status = "ACTIVE",
            endedAtMs = null,
            pausedTotalMs = pausedTotalMs,
            distanceM = totalDistanceM,
            durationSeconds = durationSec,
            calories = calories,
            avgPaceSecPerKm = avgPace,
            pointCount = pointSeq
        )

        requestLocationUpdates()
        updateNotification()
        dbHelper.getSessionById(sessionId)?.let {
            currentListener?.onStateChanged("RESUMED", it)
        }
    }

    private fun handleFinish() {
        val sessionId = activeSessionId
        val now = System.currentTimeMillis()

        pauseStartedAtMs?.let { pausedAt ->
            pausedTotalMs += (now - pausedAt).coerceAtLeast(0L)
        }
        pauseStartedAtMs = null

        stopLocationUpdates()
        isRunning = false
        currentStatus = "FINISHED"

        if (sessionId != null) {
            val durationSec = computeDurationSeconds(now)
            val calories = computeCalories(durationSec)
            val avgPace = if (totalDistanceM > 0) durationSec / (totalDistanceM / 1000.0) else null

            dbHelper.updateSessionProgress(
                id = sessionId,
                status = "FINISHED",
                endedAtMs = now,
                pausedTotalMs = pausedTotalMs,
                distanceM = totalDistanceM,
                durationSeconds = durationSec,
                calories = calories,
                avgPaceSecPerKm = avgPace,
                pointCount = pointSeq,
                syncState = "PENDING"
            )

            dbHelper.getSessionById(sessionId)?.let {
                currentListener?.onStateChanged("FINISHED", it)
            }
        }

        activeSessionId = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun requestLocationUpdates() {
        val hasFine = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasFine && !hasCoarse) return

        val intervalMs = when (exerciseType) {
            "CYCLING" -> 2000L
            "RUNNING" -> 2500L
            else -> 3500L
        }

        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    intervalMs,
                    2f,
                    this,
                    Looper.getMainLooper()
                )
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    intervalMs * 2,
                    5f,
                    this,
                    Looper.getMainLooper()
                )
            }
        } catch (ex: SecurityException) {
            // Permission revoked dynamically
        }
    }

    private fun stopLocationUpdates() {
        try {
            locationManager.removeUpdates(this)
        } catch (ignored: Exception) {
        }
    }

    override fun onLocationChanged(location: Location) {
        val sessionId = activeSessionId ?: return
        if (currentStatus != "ACTIVE") return

        // Filter inaccurate points
        if (location.hasAccuracy() && location.accuracy > MAX_ACCURACY_METERS) {
            return
        }

        val previous = lastValidLocation
        if (previous != null) {
            val deltaM = haversineMeters(
                previous.latitude, previous.longitude,
                location.latitude, location.longitude
            )

            // Ignore stationary noise (< 2m)
            if (deltaM < MIN_DISTANCE_METERS) {
                return
            }

            // Filter unrealistic GPS teleport spikes (> 45 m/s ~ 162 km/h)
            val dtSec = ((location.time - previous.time) / 1000.0).coerceAtLeast(0.5)
            if (deltaM / dtSec > 45.0) {
                return
            }

            totalDistanceM += deltaM
        }

        lastValidLocation = location
        val seq = pointSeq++
        val record = LocalGpsPointRecord(
            seq = seq,
            latitude = location.latitude,
            longitude = location.longitude,
            altitudeM = if (location.hasAltitude()) location.altitude else null,
            speedMps = if (location.hasSpeed()) location.speed.toDouble() else null,
            accuracyM = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
            recordedAtMs = location.time
        )

        dbHelper.insertGpsPoint(sessionId, record)

        val now = System.currentTimeMillis()
        val durationSec = computeDurationSeconds(now)
        val calories = computeCalories(durationSec)
        val avgPace = if (totalDistanceM > 0) durationSec / (totalDistanceM / 1000.0) else null

        dbHelper.updateSessionProgress(
            id = sessionId,
            status = "ACTIVE",
            endedAtMs = null,
            pausedTotalMs = pausedTotalMs,
            distanceM = totalDistanceM,
            durationSeconds = durationSec,
            calories = calories,
            avgPaceSecPerKm = avgPace,
            pointCount = pointSeq
        )

        updateNotification()
        currentListener?.onPointRecorded(record, totalDistanceM)
    }

    @Deprecated("Deprecated in Android API 29")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    private fun computeDurationSeconds(nowMs: Long): Int {
        val pausedOffset = pauseStartedAtMs?.let { (nowMs - it).coerceAtLeast(0L) } ?: 0L
        val activeMs = (nowMs - startedAtMs - pausedTotalMs - pausedOffset).coerceAtLeast(0L)
        return (activeMs / 1000L).toInt()
    }

    private fun computeCalories(durationSeconds: Int): Double {
        val met = when (exerciseType) {
            "WALKING" -> 3.5
            "RUNNING" -> 8.5
            "CYCLING" -> 7.5
            else -> 5.0
        }
        val kcal = met * 70.0 * (durationSeconds / 3600.0)
        return (kcal * 10.0).roundToInt() / 10.0
    }

    private fun haversineMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }

    private fun startForegroundCompat(notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateNotification() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun buildNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val distKm = String.format("%.2f km", totalDistanceM / 1000.0)
        val statusLabel = if (currentStatus == "PAUSED") "Đang tạm dừng" else "Đang ghi lộ trình"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FitSense · $exerciseType")
            .setContentText("$statusLabel · $distKm")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Exercise GPS Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Hiển thị trạng thái buổi tập GPS đang chạy nền"
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        stopLocationUpdates()
        isRunning = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
