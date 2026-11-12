package com.fitsensemobile.sensors

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.fitsensemobile.common.TimeUtils

/** Chủ: B (F6). Stub ngày 1: chưa đọc cảm biến thật. */
class MotionSensorModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    override fun getName(): String = "MotionSensor"

    @ReactMethod
    fun getSnapshot(promise: Promise) {
        promise.resolve(Arguments.createMap().apply {
            putString("status", "AVAILABLE")
            putString("label", "STILL")
            putDouble("confidence", 0.0)
            putNull("lastSample")
            putDouble("updatedAtMs", TimeUtils.nowMs().toDouble())
        })
    }

    @ReactMethod
    fun start(sensors: String, promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun stop(promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun setEmitInterval(intervalMs: Double, promise: Promise) {
        promise.resolve(null)
    }
}
