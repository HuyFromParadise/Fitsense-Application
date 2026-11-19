package com.fitsensemobile.sync

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.fitsensemobile.common.TimeUtils
import com.fitsensemobile.database.FitSenseDatabase
import com.fitsensemobile.database.entity.SyncQueueEntity
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * Chủ: B (F8). Primitive hàng đợi cho JS `syncManager`: không HTTP, không token —
 * JS điều phối `/api/activities/sync` bằng axios.
 */
class SyncModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    private val db by lazy { FitSenseDatabase.getInstance(context) }
    private val executor = Executors.newSingleThreadExecutor()

    override fun getName(): String = "Sync"

    @ReactMethod
    fun enqueue(entityType: String, clientId: String, payload: ReadableMap, promise: Promise) {
        executor.execute {
            runBlocking {
                runCatching {
                    db.syncQueueDao().enqueue(
                        entityType = entityType,
                        clientId = clientId,
                        operation = "UPSERT",
                        payload = payload.toJson().toString(),
                        now = TimeUtils.nowMs(),
                    )
                }
                    .onSuccess { promise.resolve(null) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    @ReactMethod
    fun getDue(entityType: String, limit: Double, promise: Promise) {
        executor.execute {
            runBlocking {
                runCatching {
                    db.syncQueueDao()
                        .getDue(entityType, TimeUtils.nowMs(), limit.toInt())
                        .map { it.toWritableMap() }
                        .toWritableArray()
                }
                    .onSuccess { promise.resolve(it) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    @ReactMethod
    fun markSyncing(ids: ReadableArray, promise: Promise) {
        mutateIds(ids, promise) { list -> db.syncQueueDao().markSyncing(list, TimeUtils.nowMs()) }
    }

    @ReactMethod
    fun markSynced(ids: ReadableArray, promise: Promise) {
        mutateIds(ids, promise) { list -> db.syncQueueDao().markSynced(list, TimeUtils.nowMs()) }
    }

    @ReactMethod
    fun markFailed(
        id: Double,
        attempts: Double,
        nextAttemptAtMs: Double,
        error: String?,
        promise: Promise,
    ) {
        executor.execute {
            runBlocking {
                runCatching {
                    db.syncQueueDao().markFailed(
                        id = id.toLong(),
                        attempts = attempts.toInt(),
                        nextAttemptAt = nextAttemptAtMs.toLong(),
                        error = error,
                        now = TimeUtils.nowMs(),
                    )
                }
                    .onSuccess { promise.resolve(null) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    @ReactMethod
    fun getPendingCount(promise: Promise) {
        executor.execute {
            runBlocking {
                runCatching { db.syncQueueDao().countUnsynced() }
                    .onSuccess { promise.resolve(it) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    @ReactMethod
    fun deleteSynced(olderThanMs: Double, promise: Promise) {
        executor.execute {
            runBlocking {
                runCatching { db.syncQueueDao().deleteSynced(olderThanMs.toLong()) }
                    .onSuccess { promise.resolve(null) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    @ReactMethod
    fun resetSyncing(promise: Promise) {
        executor.execute {
            runBlocking {
                runCatching { db.syncQueueDao().resetSyncing(TimeUtils.nowMs()) }
                    .onSuccess { promise.resolve(null) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    @ReactMethod
    fun clearAll(promise: Promise) {
        executor.execute {
            runBlocking {
                runCatching { db.syncQueueDao().clearAll() }
                    .onSuccess { promise.resolve(null) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    private fun mutateIds(
        ids: ReadableArray,
        promise: Promise,
        mutation: suspend (List<Long>) -> Unit,
    ) {
        if (ids.size() == 0) {
            promise.resolve(null)
            return
        }
        val list = (0 until ids.size()).map { ids.getDouble(it).toLong() }
        executor.execute {
            runBlocking {
                runCatching { mutation(list) }
                    .onSuccess { promise.resolve(null) }
                    .onFailure { promise.reject("DATABASE_ERROR", it.message, it) }
            }
        }
    }

    private fun List<WritableMap>.toWritableArray(): WritableArray =
        Arguments.createArray().also { array -> forEach { array.pushMap(it) } }

    private fun SyncQueueEntity.toWritableMap(): WritableMap =
        Arguments.createMap().apply {
            putInt("id", id.toInt())
            putString("entityType", entityType)
            putString("clientId", clientId)
            putString("payloadJson", payload)
            putInt("attempts", attempts)
            putDouble("nextAttemptAtMs", nextAttemptAt.toDouble())
        }

    private fun ReadableMap.toJson(): JSONObject {
        val json = JSONObject()
        val keys = keySetIterator()
        while (keys.hasNextKey()) {
            val key = keys.nextKey()
            when (getType(key)) {
                ReadableType.Null -> json.put(key, JSONObject.NULL)
                ReadableType.Boolean -> json.put(key, getBoolean(key))
                ReadableType.Number -> json.put(key, getDouble(key))
                ReadableType.String -> json.put(key, getString(key))
                ReadableType.Map -> json.put(key, getMap(key)?.toJson())
                ReadableType.Array -> json.put(key, getArray(key)?.toJson() ?: JSONArray())
            }
        }
        return json
    }

    private fun ReadableArray.toJson(): JSONArray {
        val json = JSONArray()
        for (index in 0 until size()) {
            when (getType(index)) {
                ReadableType.Null -> json.put(JSONObject.NULL)
                ReadableType.Boolean -> json.put(getBoolean(index))
                ReadableType.Number -> json.put(getDouble(index))
                ReadableType.String -> json.put(getString(index))
                ReadableType.Map -> json.put(getMap(index)?.toJson())
                ReadableType.Array -> json.put(getArray(index)?.toJson() ?: JSONArray())
            }
        }
        return json
    }
}
