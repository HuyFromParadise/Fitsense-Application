package com.fitsensemobile.notification

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.fitsensemobile.common.PermissionHelper

/** Chủ: B (F9). Stub ngày 1: tạo channel + hiển thị notification cục bộ. */
class NotificationModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    init {
        createChannels()
    }

    override fun getName(): String = "Notification"

    @ReactMethod
    fun ensureReady(promise: Promise) {
        createChannels()
        val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            PermissionHelper.isGranted(context, Manifest.permission.POST_NOTIFICATIONS)
        promise.resolve(PermissionHelper.statusName(granted))
    }

    @ReactMethod
    fun show(input: ReadableMap, promise: Promise) {
        runCatching {
            val id = input.getDouble("id").toInt()
            val notification = NotificationCompat.Builder(
                context,
                input.getString("channelId") ?: CHANNEL_DEFAULT,
            )
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(input.getString("title") ?: "")
                .setContentText(input.getString("body") ?: "")
                .setAutoCancel(true)
                .build()

            val manager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(id, notification)
        }
            .onSuccess { promise.resolve(null) }
            .onFailure { promise.reject("UNKNOWN", it.message, it) }
    }

    @ReactMethod
    fun cancel(id: Double, promise: Promise) {
        val manager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(id.toInt())
        promise.resolve(null)
    }

    @ReactMethod
    fun scheduleDailyReminders(startHour: Double, endHour: Double, promise: Promise) {
        // Khung: WorkManager sẽ được nối ở F9.
        promise.resolve(null)
    }

    @ReactMethod
    fun cancelDailyReminders(promise: Promise) {
        promise.resolve(null)
    }

    private fun createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val manager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        listOf(CHANNEL_DEFAULT, CHANNEL_ACTIVITY, CHANNEL_GOAL).forEach { channelId ->
            manager.createNotificationChannel(
                NotificationChannel(
                    channelId,
                    channelId,
                    NotificationManager.IMPORTANCE_DEFAULT,
                ),
            )
        }
    }

    private companion object {
        const val CHANNEL_DEFAULT = "fitsense_default"
        const val CHANNEL_ACTIVITY = "fitsense_activity"
        const val CHANNEL_GOAL = "fitsense_goal"
    }
}
