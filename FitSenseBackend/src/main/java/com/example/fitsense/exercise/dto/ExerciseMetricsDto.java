package com.example.fitsense.exercise.dto;

import com.example.fitsense.exercise.entity.ExerciseMetricEntity;
import jakarta.validation.constraints.Min;
import lombok.Builder;

@Builder
public record ExerciseMetricsDto(
        @Min(value = 0, message = "distanceM must be >= 0")
        double distanceM,

        @Min(value = 0, message = "durationSeconds must be >= 0")
        int durationSeconds,

        Double avgPaceSecPerKm,
        Double avgSpeedMps,

        @Min(value = 0, message = "calories must be >= 0")
        double calories
) {
    public static ExerciseMetricsDto fromEntity(ExerciseMetricEntity entity) {
        if (entity == null) {
            return ExerciseMetricsDto.builder()
                    .distanceM(0)
                    .durationSeconds(0)
                    .calories(0)
                    .build();
        }
        return ExerciseMetricsDto.builder()
                .distanceM(entity.getDistanceM())
                .durationSeconds(entity.getDurationSeconds())
                .avgPaceSecPerKm(entity.getAvgPaceSecPerKm())
                .avgSpeedMps(entity.getAvgSpeedMps())
                .calories(entity.getCalories())
                .build();
    }
}
