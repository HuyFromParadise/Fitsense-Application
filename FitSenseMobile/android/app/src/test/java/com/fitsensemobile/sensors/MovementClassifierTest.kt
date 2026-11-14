package com.fitsensemobile.sensors

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.PI
import kotlin.math.sin

class MovementClassifierTest {

    /** Cấp mẫu hình sin quanh 9.81 m/s²; std ≈ amplitude / √2. Trả về timestamp kế tiếp. */
    private fun feed(
        classifier: MovementClassifier,
        amplitude: Double,
        samples: Int,
        startAt: Long,
    ): Long {
        var timestamp = startAt
        repeat(samples) { i ->
            val magnitude = 9.81 + amplitude * sin(2 * PI * i / 10.0)
            classifier.addSample(magnitude, timestamp)
            timestamp += 100
        }
        return timestamp
    }

    @Test
    fun `not enough samples stays unknown`() {
        val classifier = MovementClassifier()

        var changed = false
        repeat(5) { i ->
            changed = classifier.addSample(9.81, i * 100L).changed
        }

        assertEquals(MotionLabel.UNKNOWN, classifier.label)
        assertFalse(changed)
        assertEquals(0.0, classifier.confidence, 0.0)
    }

    @Test
    fun `steady samples classify still`() {
        val classifier = MovementClassifier()

        feed(classifier, amplitude = 0.0, samples = 40, startAt = 0)

        assertEquals(MotionLabel.STILL, classifier.label)
        assertTrue(classifier.confidence > 0.9)
    }

    @Test
    fun `moderate oscillation classifies walking`() {
        val classifier = MovementClassifier()

        feed(classifier, amplitude = 1.0, samples = 40, startAt = 0)

        assertEquals(MotionLabel.WALKING, classifier.label)
        assertTrue(classifier.confidence > 0.0)
    }

    @Test
    fun `strong oscillation classifies running`() {
        val classifier = MovementClassifier()

        feed(classifier, amplitude = 4.0, samples = 40, startAt = 0)

        assertEquals(MotionLabel.RUNNING, classifier.label)
        assertTrue(classifier.confidence > 0.0)
    }

    @Test
    fun `short burst does not flip the label`() {
        val classifier = MovementClassifier()
        var timestamp = feed(classifier, amplitude = 0.0, samples = 40, startAt = 0)
        assertEquals(MotionLabel.STILL, classifier.label)

        // 1,2 giây chạy = 2 lần đánh giá, chưa đủ STABLE_WINDOWS.
        timestamp = feed(classifier, amplitude = 4.0, samples = 12, startAt = timestamp)
        assertEquals(MotionLabel.STILL, classifier.label)

        feed(classifier, amplitude = 0.0, samples = 40, startAt = timestamp)
        assertEquals(MotionLabel.STILL, classifier.label)
    }

    @Test
    fun `hysteresis gap keeps the previous label`() {
        val classifier = MovementClassifier()
        var timestamp = feed(classifier, amplitude = 4.0, samples = 40, startAt = 0)
        assertEquals(MotionLabel.RUNNING, classifier.label)

        // std ≈ 2.33 nằm giữa WALKING_MAX_STD và RUNNING_MIN_STD.
        feed(classifier, amplitude = 3.3, samples = 40, startAt = timestamp)

        assertEquals(MotionLabel.RUNNING, classifier.label)
    }

    @Test
    fun `reset clears window and label`() {
        val classifier = MovementClassifier()
        feed(classifier, amplitude = 4.0, samples = 40, startAt = 0)

        classifier.reset()

        assertEquals(MotionLabel.UNKNOWN, classifier.label)
        assertEquals(0.0, classifier.confidence, 0.0)
    }
}
