package com.fitsensemobile.sensors

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.fitsensemobile.common.EventEmitterHelper
import com.fitsensemobile.common.TimeUtils
import kotlin.math.sqrt

/**
 * F6: accelerometer + gyroscope thật. Emit MOTION_SAMPLE (~10 Hz, throttled) và
 * MOTION_LABEL_CHANGED (do [MovementClassifier] quyết định). Không cần runtime permission
 * trên Android; PERMISSION_DENIED trong contract giữ cho tương lai.
 */
class MotionSensorModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), LifecycleEventListener {

    private data class Sample(
        val x: Double,
        val y: Double,
        val z: Double,
        val magnitude: Double,
        val timestampMs: Long,
    )

    private val sensorManager by lazy {
        context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }
    private val accelerometer by lazy { sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) }
    private val gyroscope by lazy { sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE) }
    private val classifier = MovementClassifier()

    private var requested = SensorSet.ACCELEROMETER
    private var listening = false
    private var shouldListen = false
    private var emitIntervalMs = SensorConfig.EMIT_INTERVAL_DEFAULT_MS
    private var lastEmitMs = 0L
    private var lastSample: Sample? = null
    private var updatedAtMs = 0L

    override fun getName(): String = "MotionSensor"

    init {
        context.addLifecycleEventListener(this)
    }

    private val accelListener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
            if (!listening) return
            val now = TimeUtils.nowMs()
            val magnitude = sqrt(
                event.values[0] * event.values[0] +
                    event.values[1] * event.values[1] +
                    event.values[2] * event.values[2],
            ).toDouble()
            val classification = classifier.addSample(magnitude, now)
            if (classification.changed) {
                EventEmitterHelper.emit(
                    context,
                    "MOTION_LABEL_CHANGED",
                    Arguments.createMap().apply {
                        putString("label", classification.label.name)
                        putDouble("confidence", classification.confidence)
                        putDouble("timestampMs", now.toDouble())
                    },
                )
            }
            handleSample(event, magnitude, now)
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
    }

    private val gyroListener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
            if (!listening) return
            // 'both': mẫu gyroscope (rad/s) cũng phát ra; chart chỉ để quan sát thô.
            val magnitude = sqrt(
                event.values[0] * event.values[0] +
                    event.values[1] * event.values[1] +
                    event.values[2] * event.values[2],
            ).toDouble()
            handleSample(event, magnitude, TimeUtils.nowMs())
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
    }

    @ReactMethod
    fun getSnapshot(promise: Promise) {
        promise.resolve(Arguments.createMap().apply {
            putString("status", status())
            putString("label", classifier.label.name)
            putDouble("confidence", classifier.confidence)
            val sample = lastSample
            if (sample == null) {
                putNull("lastSample")
            } else {
                putMap("lastSample", sample.toWritableMap())
            }
            putDouble("updatedAtMs", (if (updatedAtMs == 0L) TimeUtils.nowMs() else updatedAtMs).toDouble())
        })
    }

    @ReactMethod
    fun start(sensors: String, promise: Promise) {
        val set = parseSensorSet(sensors)
        if (set == null) {
            promise.reject("INVALID_STATE", "Unknown sensor set: $sensors")
            return
        }
        requested = set
        if (missingSensor(set)) {
            promise.reject("UNAVAILABLE", "Requested sensor is not available on this device")
            return
        }
        shouldListen = true
        if (listening) {
            promise.resolve(null)
            return
        }
        if (!registerListeners()) {
            shouldListen = false
            promise.reject("UNAVAILABLE", "Could not register motion sensors")
            return
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun stop(promise: Promise) {
        shouldListen = false
        unregisterListeners()
        classifier.reset()
        promise.resolve(null)
    }

    @ReactMethod
    fun setEmitInterval(intervalMs: Double, promise: Promise) {
        emitIntervalMs = intervalMs.toLong().coerceAtLeast(SensorConfig.EMIT_INTERVAL_MIN_MS)
        promise.resolve(null)
    }

    override fun onHostPause() {
        unregisterListeners()
    }

    override fun onHostResume() {
        if (shouldListen && !listening) registerListeners()
    }

    override fun onHostDestroy() {
        shouldListen = false
        unregisterListeners()
        classifier.reset()
    }

    private fun registerListeners(): Boolean {
        val accel = sensorManager.registerListener(
            accelListener,
            accelerometer,
            SensorManager.SENSOR_DELAY_UI,
        )
        val needsGyro = requested != SensorSet.ACCELEROMETER
        val gyro = !needsGyro || sensorManager.registerListener(
            gyroListener,
            gyroscope,
            SensorManager.SENSOR_DELAY_UI,
        )
        listening = accel && gyro
        if (!listening) unregisterListeners()
        return listening
    }

    private fun unregisterListeners() {
        sensorManager.unregisterListener(accelListener)
        sensorManager.unregisterListener(gyroListener)
        listening = false
    }

    private fun handleSample(event: SensorEvent, magnitude: Double, now: Long) {
        val sample = Sample(
            x = event.values[0].toDouble(),
            y = event.values[1].toDouble(),
            z = event.values[2].toDouble(),
            magnitude = magnitude,
            timestampMs = now,
        )
        lastSample = sample
        updatedAtMs = now
        if (now - lastEmitMs < emitIntervalMs) return
        lastEmitMs = now
        EventEmitterHelper.emit(context, "MOTION_SAMPLE", sample.toWritableMap())
    }

    private fun Sample.toWritableMap(): WritableMap = Arguments.createMap().apply {
        putDouble("x", x)
        putDouble("y", y)
        putDouble("z", z)
        putDouble("magnitude", magnitude)
        putDouble("timestampMs", timestampMs.toDouble())
    }

    private fun status(): String = when {
        accelerometer == null -> "UNAVAILABLE"
        missingSensor(requested) -> "UNAVAILABLE"
        else -> "AVAILABLE"
    }

    private fun missingSensor(set: SensorSet): Boolean = when (set) {
        SensorSet.ACCELEROMETER -> accelerometer == null
        SensorSet.GYROSCOPE -> gyroscope == null
        SensorSet.BOTH -> accelerometer == null || gyroscope == null
    }

    private fun parseSensorSet(value: String): SensorSet? = when (value) {
        "accelerometer" -> SensorSet.ACCELEROMETER
        "gyroscope" -> SensorSet.GYROSCOPE
        "both" -> SensorSet.BOTH
        else -> null
    }

    private enum class SensorSet { ACCELEROMETER, GYROSCOPE, BOTH }
}
