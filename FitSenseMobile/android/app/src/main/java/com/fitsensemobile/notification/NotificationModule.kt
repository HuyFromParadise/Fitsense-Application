package com.fitsensemobile.notification

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.fitsensemobile.common.PermissionHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** Chủ: B (F9). WorkManager nhắc bước chân + nhắc ít vận động trong khung giờ. */
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
        // Validate input
        val start = startHour.toInt()
        val end = endHour.toInt()
        if (start < 0 || start > 23 || end < 0 || end > 23 || start >= end) {
            promise.reject("INVALID_ARGUMENT", "startHour (0-23) must be < endHour (0-23)")
            return
        }

        // Lưu trạng thái bật & khung giờ vào SharedPreferences để Worker và UI đọc
        val prefs = context.getSharedPreferences(DailyReminderWorker.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean(DailyReminderWorker.PREF_ENABLED, true)
            .putInt(DailyReminderWorker.PREF_START_HOUR, start)
            .putInt(DailyReminderWorker.PREF_END_HOUR, end)
            .apply()

        // Xóa dedupe keys cũ để có thể gửi lại khi thay đổi cài đặt
        val today = com.fitsensemobile.common.TimeUtils.todayIso()
        prefs.edit()
            .remove("step_goal_$today")
            .remove("inactivity_$today")
            .apply()

        // Đăng ký WorkManager periodic (~1h/lần)
        DailyReminderWorker.enqueuePeriodic(context)
        promise.resolve(null)
    }

    @ReactMethod
    fun cancelDailyReminders(promise: Promise) {
        val prefs = context.getSharedPreferences(DailyReminderWorker.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(DailyReminderWorker.PREF_ENABLED, false).apply()
        DailyReminderWorker.cancel(context)
        promise.resolve(null)
    }

    @ReactMethod
    fun getDailyReminderConfig(promise: Promise) {
        val prefs = context.getSharedPreferences(DailyReminderWorker.PREFS_NAME, Context.MODE_PRIVATE)
        val map = Arguments.createMap().apply {
            putBoolean("enabled", prefs.getBoolean(DailyReminderWorker.PREF_ENABLED, false))
            putInt("startHour", prefs.getInt(DailyReminderWorker.PREF_START_HOUR, 8))
            putInt("endHour", prefs.getInt(DailyReminderWorker.PREF_END_HOUR, 21))
            putInt("stepGoal", prefs.getInt(DailyReminderWorker.PREF_STEP_GOAL, 8000))
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun setDailyStepGoal(goalSteps: Double, promise: Promise) {
        val prefs = context.getSharedPreferences(DailyReminderWorker.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putInt(DailyReminderWorker.PREF_STEP_GOAL, goalSteps.toInt().coerceAtLeast(1)).apply()
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