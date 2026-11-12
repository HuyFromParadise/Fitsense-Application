package com.fitsensemobile.steps

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Snapshot cần lưu cho một ngày (khớp `StepSnapshotEntity`). */
data class StepSnapshotState(
    val date: String,
    val timezoneId: String,
    val baselineCounter: Long,
    val lastCounter: Long,
    val steps: Int,
    val bootCount: Int,
    val updatedAt: Long,
)

data class StepBaselineInput(
    val previous: StepSnapshotState?,
    val counter: Long,
    val today: String,
    val timezoneId: String,
    val bootCount: Int,
    val nowMs: Long,
)

data class StepBaselineResult(
    val today: StepSnapshotState,
    val closedDays: List<StepSnapshotState>,
)

/**
 * Tách logic baseline khỏi Android để test được. Counter là tổng bước từ lần boot
 * của cảm biến `TYPE_STEP_COUNTER`; baseline là giá trị counter tại 00:00 hôm nay.
 */
object StepBaselineCalculator {

    fun compute(input: StepBaselineInput): StepBaselineResult {
        val previous = input.previous
            ?: return StepBaselineResult(newDay(input, 0, input.counter), emptyList())

        if (input.today < previous.date) {
            // Đồng hồ bị chỉnh lùi: giữ nguyên snapshot cũ, không tạo dữ liệu sai.
            return StepBaselineResult(previous, emptyList())
        }

        if (input.today == previous.date) {
            val reset = input.bootCount != previous.bootCount || input.counter < previous.lastCounter
            val steps = if (reset) {
                previous.steps
            } else {
                val delta = (input.counter - previous.lastCounter).coerceAtLeast(0)
                (previous.steps.toLong() + delta)
                    .coerceAtMost(Int.MAX_VALUE.toLong())
                    .toInt()
            }
            val today = previous.copy(
                baselineCounter = if (reset) input.counter else previous.baselineCounter,
                lastCounter = input.counter,
                steps = steps,
                bootCount = input.bootCount,
                updatedAt = input.nowMs,
            )
            return StepBaselineResult(today, emptyList())
        }

        // Sang ngày mới: chốt ngày cũ bằng dữ liệu đã biết, các ngày bị bỏ lỡ ghi 0 bước
        // để không nhân đôi số bước, rồi đặt baseline mới cho hôm nay.
        val closed = mutableListOf(previous.copy(updatedAt = input.nowMs))
        var cursor = addDay(previous.date)
        while (cursor < input.today) {
            closed.add(
                StepSnapshotState(
                    date = cursor,
                    timezoneId = input.timezoneId,
                    baselineCounter = previous.lastCounter,
                    lastCounter = previous.lastCounter,
                    steps = 0,
                    bootCount = previous.bootCount,
                    updatedAt = input.nowMs,
                ),
            )
            cursor = addDay(cursor)
        }

        return StepBaselineResult(newDay(input, 0, input.counter), closed)
    }

    private fun newDay(input: StepBaselineInput, steps: Int, baseline: Long) =
        StepSnapshotState(
            date = input.today,
            timezoneId = input.timezoneId,
            baselineCounter = baseline,
            lastCounter = input.counter,
            steps = steps,
            bootCount = input.bootCount,
            updatedAt = input.nowMs,
        )

    private val format = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
        isLenient = false
    }

    private fun addDay(date: String): String {
        val calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            time = format.parse(date) ?: Date(0)
            add(Calendar.DAY_OF_MONTH, 1)
        }
        return format.format(calendar.time)
    }
}
