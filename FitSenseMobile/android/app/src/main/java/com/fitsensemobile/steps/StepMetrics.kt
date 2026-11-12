package com.fitsensemobile.steps

/** Công thức dùng chung khi native tự ghi `local_activity` (chưa biết profile -> mặc định 170cm/70kg). */
object StepMetrics {

    const val DEFAULT_HEIGHT_CM = 170.0
    const val DEFAULT_WEIGHT_KG = 70.0

    fun strideM(heightCm: Double = DEFAULT_HEIGHT_CM): Double = heightCm * 0.00415

    fun distanceM(steps: Int, heightCm: Double = DEFAULT_HEIGHT_CM): Double =
        steps * strideM(heightCm)

    fun calories(distanceM: Double, weightKg: Double = DEFAULT_WEIGHT_KG): Double =
        (distanceM / 1000.0) * weightKg * 0.5

    fun activeMinutes(steps: Int): Int = steps / 100
}
