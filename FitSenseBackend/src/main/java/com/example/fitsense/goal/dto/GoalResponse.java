package com.example.fitsense.goal.dto;

import com.example.fitsense.goal.entity.GoalEntity;
import com.example.fitsense.goal.entity.GoalType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record GoalResponse(
        UUID id,
        GoalType type,
        double targetValue,
        LocalDate startsOn,
        LocalDate endsOn,
        boolean enabled,
        Instant createdAt
) {
    public static GoalResponse fromEntity(GoalEntity goal) {
        return GoalResponse.builder()
                .id(goal.getId())
                .type(goal.getType())
                .targetValue(goal.getTargetValue())
                .startsOn(goal.getStartsOn())
                .endsOn(goal.getEndsOn())
                .enabled(goal.isEnabled())
                .createdAt(goal.getCreatedAt())
                .build();
    }
}
