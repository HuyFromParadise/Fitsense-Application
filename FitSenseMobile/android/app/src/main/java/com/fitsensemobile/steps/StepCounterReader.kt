package com.fitsensemobile.steps

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

/** Đọc một lần counter hiện tại từ `TYPE_STEP_COUNTER` (dùng cho WorkManager khi app đóng). */
object StepCounterReader {

    suspend fun readCounter(context: Context, timeoutMs: Long = 5_000): Long? =
        withContext(Dispatchers.Main) {
            val manager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
            val sensor = manager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return@withContext null

            suspendCancellableCoroutine { continuation ->
                val listener = object : SensorEventListener {
                    override fun onSensorChanged(event: SensorEvent) {
                        manager.unregisterListener(this)
                        if (continuation.isActive) continuation.resume(event.values[0].toLong())
                    }

                    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
                }
                val handler = Handler(Looper.getMainLooper())
                val timeout = Runnable {
                    manager.unregisterListener(listener)
                    if (continuation.isActive) continuation.resume(null)
                }
                handler.postDelayed(timeout, timeoutMs)
                continuation.invokeOnCancellation {
                    handler.removeCallbacks(timeout)
                    manager.unregisterListener(listener)
                }
                manager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
            }
        }
}
