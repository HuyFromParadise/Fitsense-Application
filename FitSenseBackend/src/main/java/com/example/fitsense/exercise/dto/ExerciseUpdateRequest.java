package com.example.fitsense.exercise.dto;

import com.example.fitsense.exercise.entity.ExerciseStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public record ExerciseUpdateRequest(
        @NotNull(message = "status is required")
        ExerciseStatus status,

        Instant endedAt,

        @Min(value = 0, message = "pausedSeconds must be >= 0")
        Integer pausedSeconds,

        @Valid
        @Size(max = 10000, message = "gpsPoints cannot exceed 10000 items per request")
        List<GpsPointDto> gpsPoints,

        @Valid
        ExerciseMetricsDto metrics
) {
}
