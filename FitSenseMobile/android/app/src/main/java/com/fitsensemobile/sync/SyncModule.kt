package com.fitsensemobile.sync

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.fitsensemobile.common.TimeUtils

/** Chủ: B (F8). Stub ngày 1: hàng đợi thật sẽ nối Room `sync_queue`. */
class SyncModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    override fun getName(): String = "Sync"

    @ReactMethod
    fun enqueue(entityType: String, clientId: String, payload: ReadableMap, promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun getPendingCount(promise: Promise) {
        promise.resolve(0)
    }

    @ReactMethod
    fun syncNow(promise: Promise) {
        promise.resolve(Arguments.createMap().apply {
            putInt("processed", 0)
            putInt("failed", 0)
        })
    }

    @ReactMethod
    fun registerHandler(entityType: String, promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun getLastSyncAt(promise: Promise) {
        promise.resolve(null)
    }
}
