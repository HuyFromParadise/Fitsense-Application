package com.fitsensemobile.location

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.fitsensemobile.common.TimeUtils
import java.util.UUID

/** Chủ: A (F2). Stub ngày 1: không ghi GPS thật, chỉ giữ trạng thái phiên. */
class ExerciseModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    private var sessionId: String? = null
    private var sessionType: String = "RUNNING"
    private var startedAtMs: Long = TimeUtils.nowMs()

    override fun getName(): String = "Exercise"

    @ReactMethod
    fun start(type: String, promise: Promise) {
        sessionId = UUID.randomUUID().toString()
        sessionType = type
        startedAtMs = TimeUtils.nowMs()
        promise.resolve(session("ACTIVE"))
    }

    @ReactMethod
    fun pause(promise: Promise) {
        promise.resolve(session("PAUSED"))
    }

    @ReactMethod
    fun resume(promise: Promise) {
        promise.resolve(session("ACTIVE"))
    }

    @ReactMethod
    fun finish(promise: Promise) {
        val finished = session("FINISHED")
        sessionId = null
        promise.resolve(finished)
    }

    @ReactMethod
    fun getActiveSession(promise: Promise) {
        promise.resolve(if (sessionId == null) null else session("ACTIVE"))
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        promise.resolve(Arguments.createMap().apply {
            putString("status", if (sessionId == null) "IDLE" else "ACTIVE")
            putString("foregroundServiceType", "location")
        })
    }

    private fun session(status: String): WritableMap = Arguments.createMap().apply {
        putString("sessionId", sessionId ?: "")
        putString("type", sessionType)
        putString("status", status)
        putDouble("startedAtMs", startedAtMs.toDouble())
        putDouble("pausedTotalMs", 0.0)
        putInt("pointCount", 0)
        putDouble("distanceM", 0.0)
    }
}
