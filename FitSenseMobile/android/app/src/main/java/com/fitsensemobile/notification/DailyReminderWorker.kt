package com.fitsensemobile.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.fitsensemobile.common.PermissionHelper
import com.fitsensemobile.common.TimeUtils
import com.fitsensemobile.database.FitSenseDatabase
import com.fitsensemobile.steps.StepCounterReader
import com.fitsensemobile.steps.StepStore
import java.util.concurrent.TimeUnit

/**
 * Worker chạy định kỳ trong khung giờ cho phép (mặc định 08:00-21:00):
 * - Nhắc đạt bước: nếu chưa đạt goal (fallback 8000) vào cuối khung giờ.
 * - Nhắc ít vận động: nếu không có bước mới trong ~60-90 phút trong khung giờ, tránh gửi lặp.
 * - Không gửi nếu POST_NOTIFICATIONS bị từ chối.
 * - Dedupe bằng key trong SharedPreferences.
 */
class DailyReminderWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        // Kiểm tra quyền POST_NOTIFICATIONS
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            !PermissionHelper.isGranted(applicationContext, android.Manifest.permission.POST_NOTIFICATIONS)
        ) {
            return Result.success()
        }

        // Kiểm tra khung giờ cho phép
        val prefs = getPrefs()
        val startHour = prefs.getInt(PREF_START_HOUR, 8)
        val endHour = prefs.getInt(PREF_END_HOUR, 21)
        if (!isWithinWindow(startHour, endHour)) {
            return Result.success()
        }

        // Đọc steps hôm nay
        val counter = StepCounterReader.readCounter(applicationContext) ?: return Result.success()
        val store = StepStore(applicationContext)
        val result = store.compute(counter)
        val stepsToday = result.today.steps

        // Goal fallback 8000 (không có bảng goal native)
        val goal = 8000

        // Kiểm tra nhắc đạt bước (cuối khung giờ)
        if (isNearEndOfWindow(endHour) && stepsToday < goal) {
            val dedupeKey = "step_goal_${TimeUtils.todayIso()}"
            if (!prefs.getBoolean(dedupeKey, false)) {
                showNotification(
                    id = NOTIFICATION_ID_STEP_GOAL,
                    title = "Chưa đạt mục tiêu bước chân",
                    body = "Hôm nay bạn đã đi $stepsToday/$goal bước. Hãy cố gắng hoàn thành chỉ tiêu!",
                    channelId = CHANNEL_GOAL
                )
                prefs.edit().putBoolean(dedupeKey, true).apply()
            }
        }

        // Kiểm tra nhắc ít vận động (inactivity ~60-90 phút)
        checkInactivityReminder(prefs, stepsToday)

        return Result.success()
    }

    private fun isWithinWindow(startHour: Int, endHour: Int): Boolean {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        return hour >= startHour && hour < endHour
    }

    private fun isNearEndOfWindow(endHour: Int): Boolean {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        val minute = java.util.Calendar.getInstance().get(java.util.Calendar.MINUTE)
        // Giờ cuối khung giờ (ví dụ endHour=21 -> kiểm tra lúc 20:30-20:59)
        return hour == endHour - 1 && minute >= 30
    }

    private fun checkInactivityReminder(prefs: SharedPreferences, currentSteps: Int) {
        val lastSteps = prefs.getInt(PREF_LAST_STEPS, -1)
        val lastChangeMs = prefs.getLong(PREF_LAST_STEPS_CHANGE_MS, 0)
        val nowMs = TimeUtils.nowMs()

        if (lastSteps == -1) {
            // Lần đầu chạy, lưu baseline
            prefs.edit()
                .putInt(PREF_LAST_STEPS, currentSteps)
                .putLong(PREF_LAST_STEPS_CHANGE_MS, nowMs)
                .apply()
            return
        }

        if (currentSteps > lastSteps) {
            // Có bước mới, reset timer
            prefs.edit()
                .putInt(PREF_LAST_STEPS, currentSteps)
                .putLong(PREF_LAST_STEPS_CHANGE_MS, nowMs)
                .apply()
            return
        }

        // Không có bước mới, kiểm tra thời gian trôi qua
        val inactiveMinutes = (nowMs - lastChangeMs) / (1000 * 60)
        if (inactiveMinutes >= 60 && inactiveMinutes <= 90) {
            val dedupeKey = "inactivity_${TimeUtils.todayIso()}"
            if (!prefs.getBoolean(dedupeKey, false)) {
                showNotification(
                    id = NOTIFICATION_ID_INACTIVITY,
                    title = "Đã lâu không vận động",
                    body = "Bạn đã ${inactiveMinutes} phút không có bước mới. Hãy đứng dậy đi lại một chút!",
                    channelId = CHANNEL_ACTIVITY
                )
                prefs.edit().putBoolean(dedupeKey, true).apply()
            }
        }
    }

    private fun getPrefs(): SharedPreferences =
        applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun showNotification(id: Int, title: String, body: String, channelId: String) {
        val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notification = NotificationCompat.Builder(applicationContext, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        manager.notify(id, notification)
    }

    companion object {
        const val WORK_NAME = "fitsense_daily_reminder"
        const val PREFS_NAME = "fitsense_reminder_prefs"
        const val PREF_START_HOUR = "start_hour"
        const val PREF_END_HOUR = "end_hour"
        const val PREF_LAST_STEPS = "last_steps"
        const val PREF_LAST_STEPS_CHANGE_MS = "last_steps_change_ms"
        const val NOTIFICATION_ID_STEP_GOAL = 1001
        const val NOTIFICATION_ID_INACTIVITY = 1002
        const val CHANNEL_DEFAULT = "fitsense_default"
        const val CHANNEL_ACTIVITY = "fitsense_activity"
        const val CHANNEL_GOAL = "fitsense_goal"

        fun enqueuePeriodic(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<DailyReminderWorker>(1, TimeUnit.HOURS)
                    .setInitialDelay(1, TimeUnit.MINUTES)
                    .build(),
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }

        /** Gọi từ BootReceiver sau reboot. */
        fun reschedule(context: Context) {
            enqueuePeriodic(context)
        }
    }
}