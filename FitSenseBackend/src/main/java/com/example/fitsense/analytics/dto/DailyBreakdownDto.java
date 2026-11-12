package com.example.fitsense.analytics.dto;

import java.time.LocalDate;
import lombok.Builder;

@Builder
public record DailyBreakdownDto(
        LocalDate date,
        long steps,
        double distanceM,
        double calories,
        int activeMinutes,
        int exerciseCount
) {
}
