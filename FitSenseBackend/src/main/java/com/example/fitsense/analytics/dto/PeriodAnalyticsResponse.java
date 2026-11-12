package com.example.fitsense.analytics.dto;

import java.time.LocalDate;
import java.util.List;
import lombok.Builder;

@Builder
public record PeriodAnalyticsResponse(
        LocalDate periodStart,
        LocalDate periodEnd,
        long totalSteps,
        double averageStepsPerDay,
        double totalDistanceM,
        double totalCalories,
        long totalActiveMinutes,
        int totalExerciseCount,
        long totalExerciseSeconds,
        LocalDate bestDay,
        double goalCompletionRate,
        PeriodAnalyticsResponse previous,
        List<DailyBreakdownDto> dailyBreakdown
) {
}
