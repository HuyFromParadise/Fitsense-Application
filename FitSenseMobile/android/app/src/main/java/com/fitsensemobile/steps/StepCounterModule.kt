package com.fitsensemobile.steps

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.fitsensemobile.common.TimeUtils

/** Chủ: B (F5). Stub ngày 1: trả 0 bước để UI không bị chặn. */
class StepCounterModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    override fun getName(): String = "StepCounter"

    @ReactMethod
    fun getStatus(promise: Promise) {
        promise.resolve("AVAILABLE")
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        promise.resolve("GRANTED")
    }

    @ReactMethod
    fun start(promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun stop(promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun getTodaySteps(promise: Promise) {
        promise.resolve(snapshot())
    }

    @ReactMethod
    fun getHistory(fromDate: String, toDate: String, promise: Promise) {
        promise.resolve(Arguments.createArray())
    }

    private fun snapshot(): WritableMap = Arguments.createMap().apply {
        putInt("stepsToday", 0)
        putInt("stepsSinceBoot", 0)
        putInt("baselineCounter", 0)
        putString("date", TimeUtils.todayIso())
        putInt("bootCount", 1)
        putString("status", "AVAILABLE")
        putDouble("updatedAtMs", TimeUtils.nowMs().toDouble())
    }
}
