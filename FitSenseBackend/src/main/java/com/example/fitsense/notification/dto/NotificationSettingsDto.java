package com.example.fitsense.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingsDto {
    private boolean weeklyReportEnabled;
    private boolean workoutRemindersEnabled;
    private boolean goalAchievementsEnabled;
}
