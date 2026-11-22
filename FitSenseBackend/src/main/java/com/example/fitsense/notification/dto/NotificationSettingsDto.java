package com.example.fitsense.notification.dto;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingsDto {
    @Builder.Default
    private boolean weeklyReportEnabled = true;

    @Builder.Default
    private boolean workoutRemindersEnabled = true;

    @Builder.Default
    private boolean goalAchievementsEnabled = true;

    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "quietHoursStart must follow HH:mm")
    private String quietHoursStart;

    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "quietHoursEnd must follow HH:mm")
    private String quietHoursEnd;
}
