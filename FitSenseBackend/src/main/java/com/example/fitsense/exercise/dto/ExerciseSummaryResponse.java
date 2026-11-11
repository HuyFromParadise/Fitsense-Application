package com.example.fitsense.exercise.dto;

import com.example.fitsense.exercise.entity.ExerciseSessionEntity;
import com.example.fitsense.exercise.entity.ExerciseStatus;
import com.example.fitsense.exercise.entity.ExerciseType;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ExerciseSummaryResponse(
        UUID id,
        ExerciseType type,
        ExerciseStatus status,
        Instant startedAt,
        Instant endedAt,
        int pausedSeconds,
        ExerciseMetricsDto metrics
) {
    public static ExerciseSummaryResponse fromEntity(ExerciseSessionEntity session) {
        return ExerciseSummaryResponse.builder()
                .id(session.getId())
                .type(session.getExerciseType())
                .status(session.getStatus())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .pausedSeconds(session.getPausedSeconds())
                .metrics(ExerciseMetricsDto.fromEntity(session.getMetrics()))
                .build();
    }
}
