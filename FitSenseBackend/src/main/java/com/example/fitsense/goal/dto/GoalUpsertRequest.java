package com.example.fitsense.goal.dto;

import com.example.fitsense.goal.entity.GoalType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

public record GoalUpsertRequest(
        @NotNull GoalType type,
        @NotNull @Positive Double targetValue,
        LocalDate startsOn,
        LocalDate endsOn,
        Boolean enabled
) {
}
