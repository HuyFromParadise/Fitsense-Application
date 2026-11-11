package com.example.fitsense.exercise.dto;

import com.example.fitsense.exercise.entity.ExerciseSessionEntity;
import com.example.fitsense.exercise.entity.ExerciseStatus;
import com.example.fitsense.exercise.entity.ExerciseType;
import com.example.fitsense.exercise.entity.GpsPointEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ExerciseDetailResponse(
        UUID id,
        ExerciseType type,
        ExerciseStatus status,
        Instant startedAt,
        Instant endedAt,
        int pausedSeconds,
        ExerciseMetricsDto metrics,
        List<GpsPointDto> gpsPoints
) {
    public static ExerciseDetailResponse fromEntity(
            ExerciseSessionEntity session,
            List<GpsPointEntity> points
    ) {
        List<GpsPointDto> pointDtos = points == null
                ? List.of()
                : points.stream().map(GpsPointDto::fromEntity).toList();

        return ExerciseDetailResponse.builder()
                .id(session.getId())
                .type(session.getExerciseType())
                .status(session.getStatus())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .pausedSeconds(session.getPausedSeconds())
                .metrics(ExerciseMetricsDto.fromEntity(session.getMetrics()))
                .gpsPoints(pointDtos)
                .build();
    }
}
