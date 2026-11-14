package com.fitsensemobile.steps

import android.content.Context
import android.provider.Settings
import com.fitsensemobile.common.TimeUtils
import com.fitsensemobile.database.FitSenseDatabase
import com.fitsensemobile.database.entity.LocalActivityEntity
import com.fitsensemobile.database.entity.StepSnapshotEntity

/** Đọc/ghi snapshot bước chân và cập nhật `local_activity` (sync_state PENDING cho F8). */
class StepStore(context: Context) {

    private val appContext = context.applicationContext
    private val db by lazy { FitSenseDatabase.getInstance(appContext) }

    suspend fun latest(): StepSnapshotState? = db.stepSnapshotDao().getLatest()?.toState()

    suspend fun compute(counter: Long): StepBaselineResult = compute(counter, latest())

    suspend fun compute(counter: Long, previous: StepSnapshotState?): StepBaselineResult =
        StepBaselineCalculator.compute(
            StepBaselineInput(
                previous = previous,
                counter = counter,
                today = TimeUtils.todayIso(),
                timezoneId = TimeUtils.timeZoneId(),
                bootCount = bootCount(appContext),
                nowMs = TimeUtils.nowMs(),
            ),
        )

    suspend fun persist(result: StepBaselineResult) {
        persistState(result)

        (result.closedDays + result.today).forEach { row ->
            val distanceM = StepMetrics.distanceM(row.steps)
            db.localActivityDao().upsert(
                LocalActivityEntity(
                    activityDate = row.date,
                    timezoneId = row.timezoneId,
                    steps = row.steps,
                    distanceM = distanceM,
                    calories = StepMetrics.calories(distanceM),
                    activeMinutes = StepMetrics.activeMinutes(row.steps),
                    updatedAt = row.updatedAt,
                    // shortcut: luôn PENDING dù đã sync; F8 sẽ giữ nguyên SYNCED khi giá trị không đổi.
                    syncState = "PENDING",
                ),
            )
        }
    }

    /**
     * Chỉ ghi `step_snapshots` (baseline + steps) để app bị kill/reboot vẫn giữ số bước.
     * Không đụng `local_activity` để không ghi đè distance/calories tính từ profile ở Dashboard.
     */
    suspend fun persistState(result: StepBaselineResult) {
        val rows = result.closedDays + result.today
        db.stepSnapshotDao().upsertAll(rows.map { it.toEntity() })
    }

    suspend fun history(fromDate: String, toDate: String): List<StepSnapshotState> =
        db.stepSnapshotDao().getRange(fromDate, toDate).map { it.toState() }

    private fun StepSnapshotEntity.toState() = StepSnapshotState(
        date = date,
        timezoneId = timezoneId,
        baselineCounter = baselineCounter,
        lastCounter = lastCounter,
        steps = steps,
        bootCount = bootCount,
        updatedAt = updatedAt,
    )

    private fun StepSnapshotState.toEntity() = StepSnapshotEntity(
        date = date,
        timezoneId = timezoneId,
        baselineCounter = baselineCounter,
        lastCounter = lastCounter,
        steps = steps,
        bootCount = bootCount,
        updatedAt = updatedAt,
    )

    companion object {
        fun bootCount(context: Context): Int =
            Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, 0)
    }
}
