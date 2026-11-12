package com.fitsensemobile.steps

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.fitsensemobile.common.EventEmitterHelper
import com.fitsensemobile.common.PermissionHelper
import com.fitsensemobile.common.TimeUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * F5: step counter thật. Counter của cảm biến là tổng bước từ lần boot; baseline/rollover/reboot
 * do [StepBaselineCalculator] quyết định, snapshot lưu qua [StepStore].
 */
class StepCounterModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), ActivityEventListener, PermissionListener {

    private val sensorManager by lazy {
        context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }
    private val sensor by lazy { sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) }
    private val store by lazy { StepStore(context) }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private val prefs by lazy {
        context.getSharedPreferences("fitsense_step_counter", Context.MODE_PRIVATE)
    }

    private var listening = false
    private var lastCounter: Long? = null
    private var cached: StepSnapshotState? = null
    private var cacheLoaded = false
    private var permissionPromise: Promise? = null

    init {
        context.addActivityEventListener(this)
    }

    override fun getName(): String = "StepCounter"

    private val listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
            val counter = event.values[0].toLong()
            lastCounter = counter
            scope.launch {
                val result = compute(counter)
                EventEmitterHelper.emit(context, "STEP_UPDATE", result.today.toWritableMap(counter))
            }
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        promise.resolve(status())
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || hasPermission()) {
            promise.resolve("GRANTED")
            return
        }

        val activity = context.currentActivity
        if (activity == null) {
            promise.resolve(permissionStatus())
            return
        }
        if (prefs.getBoolean(KEY_ASKED, false) &&
            !ActivityCompat.shouldShowRequestPermissionRationale(activity, PERMISSION)
        ) {
            promise.resolve("PERMANENTLY_DENIED")
            return
        }

        permissionPromise = promise
        prefs.edit().putBoolean(KEY_ASKED, true).apply()
        (activity as? PermissionAwareActivity)?.requestPermissions(
            arrayOf(PERMISSION),
            REQUEST_CODE,
            this,
        ) ?: run {
            permissionPromise = null
            promise.resolve(permissionStatus())
        }
    }

    @ReactMethod
    fun start(promise: Promise) {
        when (status()) {
            "UNAVAILABLE" -> {
                promise.reject("UNAVAILABLE", "Step counter sensor is not available")
                return
            }
            "PERMISSION_DENIED" -> {
                promise.reject("PERMISSION_DENIED", "ACTIVITY_RECOGNITION permission is required")
                return
            }
        }
        if (listening) {
            promise.resolve(null)
            return
        }
        listening = sensorManager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_UI)
        if (!listening) {
            promise.reject("UNAVAILABLE", "Could not register step counter listener")
            return
        }
        StepSnapshotWorker.enqueuePeriodic(context)
        promise.resolve(null)
    }

    @ReactMethod
    fun stop(promise: Promise) {
        if (listening) {
            sensorManager.unregisterListener(listener)
            listening = false
        }
        val counter = lastCounter
        if (counter == null) {
            promise.resolve(null)
            return
        }
        scope.launch {
            runCatching { store.persist(compute(counter)) }
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun getTodaySteps(promise: Promise) {
        scope.launch {
            runCatching {
                val counter = lastCounter ?: StepCounterReader.readCounter(context)
                    ?: error("Step counter sensor did not report a value")
                val result = compute(counter)
                store.persist(result)
                result.today.toWritableMap(counter)
            }
                .onSuccess { promise.resolve(it) }
                .onFailure { promise.reject("UNAVAILABLE", it.message, it) }
        }
    }

    @ReactMethod
    fun getHistory(fromDate: String, toDate: String, promise: Promise) {
        scope.launch {
            runCatching {
                Arguments.createArray().also { array ->
                    store.history(fromDate, toDate).forEach { state ->
                        array.pushMap(state.toWritableMap(state.lastCounter))
                    }
                }
            }
                .onSuccess { promise.resolve(it) }
                .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
        }
    }

    private suspend fun compute(counter: Long): StepBaselineResult = mutex.withLock {
        if (!cacheLoaded) {
            cached = store.latest()
            cacheLoaded = true
        }
        val result = StepBaselineCalculator.compute(
            StepBaselineInput(
                previous = cached,
                counter = counter,
                today = TimeUtils.todayIso(),
                timezoneId = TimeUtils.timeZoneId(),
                bootCount = StepStore.bootCount(context),
                nowMs = TimeUtils.nowMs(),
            ),
        )
        cached = result.today
        result
    }

    private fun status(): String = when {
        sensor == null -> "UNAVAILABLE"
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !hasPermission() -> "PERMISSION_DENIED"
        else -> "AVAILABLE"
    }

    private fun permissionStatus(): String {
        if (hasPermission()) return "GRANTED"
        if (!prefs.getBoolean(KEY_ASKED, false)) return "NOT_DETERMINED"
        val activity = context.currentActivity
        val canAsk = activity != null &&
            ActivityCompat.shouldShowRequestPermissionRationale(activity, PERMISSION)
        return if (canAsk) "DENIED" else "PERMANENTLY_DENIED"
    }

    private fun hasPermission(): Boolean =
        PermissionHelper.isGranted(context, PERMISSION)

    private fun StepSnapshotState.toWritableMap(sinceBoot: Long): WritableMap =
        Arguments.createMap().apply {
            putInt("stepsToday", steps)
            putDouble("stepsSinceBoot", sinceBoot.toDouble())
            putDouble("baselineCounter", baselineCounter.toDouble())
            putString("date", date)
            putInt("bootCount", bootCount)
            putString("status", status())
            putDouble("updatedAtMs", updatedAt.toDouble())
        }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray,
    ): Boolean {
        if (requestCode != REQUEST_CODE) return false
        val granted = grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED
        permissionPromise?.resolve(if (granted) "GRANTED" else permissionStatus())
        permissionPromise = null
        return true
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
    ) = Unit

    override fun onNewIntent(intent: Intent) = Unit

    private companion object {
        const val PERMISSION = Manifest.permission.ACTIVITY_RECOGNITION
        const val REQUEST_CODE = 5105
        const val KEY_ASKED = "activity_recognition_asked"
    }
}
