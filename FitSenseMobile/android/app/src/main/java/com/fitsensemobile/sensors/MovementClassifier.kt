package com.fitsensemobile.sensors

import kotlin.math.abs
import kotlin.math.sqrt

enum class MotionLabel { STILL, WALKING, RUNNING, UNKNOWN }

data class MotionClassification(
    val label: MotionLabel,
    val confidence: Double,
    val changed: Boolean,
)

/**
 * Phân loại chuyển động từ độ lớn gia tốc bằng cửa sổ trượt (thuần Kotlin, test được).
 * Nhãn chỉ đổi sau [SensorConfig.STABLE_WINDOWS] lần đánh giá liên tiếp; vùng giữa
 * WALKING_MAX_STD và RUNNING_MIN_STD giữ nguyên nhãn cũ để tránh nhấp nháy.
 */
class MovementClassifier(
    private val windowMs: Long = SensorConfig.WINDOW_MS,
    private val minSamples: Int = SensorConfig.MIN_SAMPLES,
    private val evalStepMs: Long = SensorConfig.EVAL_STEP_MS,
    private val stableWindows: Int = SensorConfig.STABLE_WINDOWS,
) {

    private data class Sample(val timestampMs: Long, val magnitude: Double)

    private val window = ArrayDeque<Sample>()
    private var lastEvalMs: Long? = null
    private var candidate: MotionLabel? = null
    private var candidateCount = 0

    var label: MotionLabel = MotionLabel.UNKNOWN
        private set
    var confidence: Double = 0.0
        private set

    fun reset() {
        window.clear()
        lastEvalMs = null
        candidate = null
        candidateCount = 0
        label = MotionLabel.UNKNOWN
        confidence = 0.0
    }

    fun addSample(magnitude: Double, timestampMs: Long): MotionClassification {
        window.addLast(Sample(timestampMs, magnitude))
        while (window.isNotEmpty() && timestampMs - window.first().timestampMs > windowMs) {
            window.removeFirst()
        }

        val previousEval = lastEvalMs
        val due = previousEval == null || timestampMs - previousEval >= evalStepMs
        if (window.size < minSamples || !due) return snapshot(changed = false)
        lastEvalMs = timestampMs

        val std = stdDev()
        val raw = classify(std)
        if (raw == null) {
            // Vùng hysteresis: giữ nhãn hiện tại, không tính là một lần ổn định.
            candidate = null
            candidateCount = 0
            return snapshot(changed = false)
        }

        if (raw == label) {
            candidate = null
            candidateCount = 0
            confidence = confidenceOf(raw, std)
            return snapshot(changed = false)
        }

        if (candidate == raw) {
            candidateCount++
        } else {
            candidate = raw
            candidateCount = 1
        }

        if (candidateCount < stableWindows) return snapshot(changed = false)

        label = raw
        confidence = confidenceOf(raw, std)
        candidate = null
        candidateCount = 0
        return snapshot(changed = true)
    }

    private fun snapshot(changed: Boolean) = MotionClassification(label, confidence, changed)

    private fun classify(std: Double): MotionLabel? = when {
        std < SensorConfig.STILL_MAX_STD -> MotionLabel.STILL
        std < SensorConfig.WALKING_MAX_STD -> MotionLabel.WALKING
        std >= SensorConfig.RUNNING_MIN_STD -> MotionLabel.RUNNING
        else -> null
    }

    private fun confidenceOf(label: MotionLabel, std: Double): Double = when (label) {
        MotionLabel.STILL -> 1.0 - std / SensorConfig.STILL_MAX_STD
        MotionLabel.WALKING -> {
            val halfBand = (SensorConfig.WALKING_MAX_STD - SensorConfig.STILL_MAX_STD) / 2
            val center = SensorConfig.STILL_MAX_STD + halfBand
            1.0 - abs(std - center) / halfBand
        }
        MotionLabel.RUNNING ->
            (std - SensorConfig.RUNNING_MIN_STD) /
                (SensorConfig.RUNNING_FULL_STD - SensorConfig.RUNNING_MIN_STD)
        MotionLabel.UNKNOWN -> 0.0
    }.coerceIn(0.0, 1.0)

    private fun stdDev(): Double {
        val mean = window.sumOf { it.magnitude } / window.size
        val variance = window.sumOf { (it.magnitude - mean) * (it.magnitude - mean) } / window.size
        return sqrt(variance)
    }
}
