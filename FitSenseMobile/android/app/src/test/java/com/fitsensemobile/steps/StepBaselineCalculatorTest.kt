package com.fitsensemobile.steps

import org.junit.Assert.assertEquals
import org.junit.Test

class StepBaselineCalculatorTest {

    private fun state(
        date: String = "2026-11-12",
        baseline: Long = 1000,
        lastCounter: Long = 1500,
        steps: Int = 500,
        bootCount: Int = 7,
    ) = StepSnapshotState(
        date = date,
        timezoneId = "Asia/Ho_Chi_Minh",
        baselineCounter = baseline,
        lastCounter = lastCounter,
        steps = steps,
        bootCount = bootCount,
        updatedAt = 1_000L,
    )

    private fun input(
        previous: StepSnapshotState? = state(),
        counter: Long = 1600,
        today: String = "2026-11-12",
        bootCount: Int = 7,
    ) = StepBaselineInput(
        previous = previous,
        counter = counter,
        today = today,
        timezoneId = "Asia/Ho_Chi_Minh",
        bootCount = bootCount,
        nowMs = 2_000L,
    )

    @Test
    fun `first reading starts baseline at current counter`() {
        val result = StepBaselineCalculator.compute(input(previous = null, counter = 4200))

        assertEquals(4200L, result.today.baselineCounter)
        assertEquals(4200L, result.today.lastCounter)
        assertEquals(0, result.today.steps)
        assertEquals(emptyList<StepSnapshotState>(), result.closedDays)
    }

    @Test
    fun `counter growth adds to today steps`() {
        val result = StepBaselineCalculator.compute(input(counter = 1750))

        assertEquals(750, result.today.steps)
        assertEquals(1000L, result.today.baselineCounter)
        assertEquals(1750L, result.today.lastCounter)
    }

    @Test
    fun `unchanged counter keeps steps`() {
        val result = StepBaselineCalculator.compute(input(counter = 1500))

        assertEquals(500, result.today.steps)
        assertEquals(1500L, result.today.lastCounter)
    }

    @Test
    fun `reboot keeps steps and moves baseline to new counter`() {
        val result = StepBaselineCalculator.compute(input(counter = 120, bootCount = 8))

        assertEquals(500, result.today.steps)
        assertEquals(120L, result.today.baselineCounter)
        assertEquals(120L, result.today.lastCounter)
        assertEquals(8, result.today.bootCount)
    }

    @Test
    fun `counter reset mid day keeps steps and moves baseline`() {
        val result = StepBaselineCalculator.compute(input(counter = 200))

        assertEquals(500, result.today.steps)
        assertEquals(200L, result.today.baselineCounter)
        assertEquals(200L, result.today.lastCounter)
    }

    @Test
    fun `date rollover closes previous day and resets today`() {
        val previous = state(baseline = 1000, lastCounter = 1500, steps = 500)
        val result = StepBaselineCalculator.compute(
            input(previous = previous, counter = 1600, today = "2026-11-13"),
        )

        assertEquals(1, result.closedDays.size)
        assertEquals("2026-11-12", result.closedDays[0].date)
        assertEquals(500, result.closedDays[0].steps)

        assertEquals("2026-11-13", result.today.date)
        assertEquals(0, result.today.steps)
        assertEquals(1600L, result.today.baselineCounter)
        assertEquals(1600L, result.today.lastCounter)
    }

    @Test
    fun `skipped days are closed without duplicating steps`() {
        val previous = state(date = "2026-11-10", steps = 500)
        val result = StepBaselineCalculator.compute(
            input(previous = previous, counter = 3000, today = "2026-11-13"),
        )

        assertEquals(
            listOf("2026-11-10", "2026-11-11", "2026-11-12"),
            result.closedDays.map { it.date },
        )
        assertEquals(500, result.closedDays[0].steps)
        assertEquals(0, result.closedDays[1].steps)
        assertEquals(0, result.closedDays[2].steps)

        assertEquals("2026-11-13", result.today.date)
        assertEquals(0, result.today.steps)
        assertEquals(3000L, result.today.baselineCounter)
    }

    @Test
    fun `clock moving backwards keeps previous snapshot`() {
        val previous = state(date = "2026-11-12")
        val result = StepBaselineCalculator.compute(
            input(previous = previous, counter = 1600, today = "2026-11-11"),
        )

        assertEquals(previous, result.today)
        assertEquals(emptyList<StepSnapshotState>(), result.closedDays)
    }
}
