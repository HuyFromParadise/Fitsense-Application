package com.example.fitsense.activity.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;

public record DailyActivityUpsert(
        @NotNull LocalDate activityDate,
        @NotBlank @Size(max = 64) String timezoneId,
        @NotNull @Min(0) Integer steps,
        @NotNull @DecimalMin("0") Double distanceM,
        @NotNull @DecimalMin("0") Double calories,
        @NotNull @Min(0) Integer activeMinutes,
        @NotNull Instant updatedAt
) {
}
