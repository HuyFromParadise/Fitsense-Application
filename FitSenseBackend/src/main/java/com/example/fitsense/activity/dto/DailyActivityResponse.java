package com.example.fitsense.activity.dto;

import com.example.fitsense.activity.entity.DailyActivityEntity;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DailyActivityResponse(
        UUID id,
        LocalDate activityDate,
        String timezoneId,
        int steps,
        double distanceM,
        double calories,
        int activeMinutes,
        Instant updatedAt) {

    public static DailyActivityResponse fromEntity(DailyActivityEntity entity) {
        return new DailyActivityResponse(
                entity.getId(),
                entity.getActivityDate(),
                entity.getTimezoneId(),
                entity.getSteps(),
                entity.getDistanceM(),
                entity.getCalories(),
                entity.getActiveMinutes(),
                entity.getUpdatedAt());
    }

    public static DailyActivityResponse empty(LocalDate date, String timezoneId) {
        return new DailyActivityResponse(null, date, timezoneId, 0, 0, 0, 0, Instant.now());
    }
}
