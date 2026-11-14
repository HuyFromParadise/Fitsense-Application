package com.fitsensemobile.sensors

/**
 * Ngưỡng phân loại chuyển động và nhịp emit của F6.
 * Chỉnh trên máy thật thì sửa ở đây (Ngày 7), không hard-code trong module.
 */
object SensorConfig {

    /** Cửa sổ trượt để tính độ lệch chuẩn gia tốc. */
    const val WINDOW_MS = 2_000L

    /** Chưa đủ mẫu trong cửa sổ thì không phân loại. */
    const val MIN_SAMPLES = 10

    /** Khoảng cách giữa hai lần đánh giá nhãn (chống nhấp nháy). */
    const val EVAL_STEP_MS = 500L

    /** Số lần đánh giá liên tiếp cùng nhãn trước khi đổi nhãn hiển thị. */
    const val STABLE_WINDOWS = 3

    /** Độ lệch chuẩn (m/s²) tối đa để coi là đứng yên. */
    const val STILL_MAX_STD = 0.35

    /** Trên ngưỡng này không còn là đi bộ. */
    const val WALKING_MAX_STD = 2.2

    /** Từ ngưỡng này trở lên là chạy; khoảng 2.2..2.6 giữ nguyên nhãn cũ (hysteresis). */
    const val RUNNING_MIN_STD = 2.6

    /** Độ lệch chuẩn coi như chạy chắc chắn (dùng cho confidence). */
    const val RUNNING_FULL_STD = 5.0

    /** Native kẹp để không vượt 20 Hz. */
    const val EMIT_INTERVAL_MIN_MS = 50L
    const val EMIT_INTERVAL_DEFAULT_MS = 100L
}
