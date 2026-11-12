package com.example.fitsense.exercise.dto;

import com.example.fitsense.exercise.entity.ExerciseStatus;
import com.example.fitsense.exercise.entity.ExerciseType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ExerciseCreateRequest(
        @NotNull(message = "id is required (client UUID)")
        UUID id,

        @NotNull(message = "type is required")
        ExerciseType type,

        @NotNull(message = "status is required")
        ExerciseStatus status,

        @NotNull(message = "startedAt is required")
        Instant startedAt,

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
