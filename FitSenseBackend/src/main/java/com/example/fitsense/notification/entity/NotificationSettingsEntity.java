package com.example.fitsense.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "notification_settings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingsEntity {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Builder.Default
    @Column(name = "weekly_report_enabled", nullable = false)
    private boolean weeklyReportEnabled = true;

    @Builder.Default
    @Column(name = "workout_reminders_enabled", nullable = false)
    private boolean workoutRemindersEnabled = true;

    @Builder.Default
    @Column(name = "goal_achievements_enabled", nullable = false)
    private boolean goalAchievementsEnabled = true;

    @Builder.Default
    @Column(name = "quiet_hours_start", nullable = false, length = 5)
    private String quietHoursStart = "22:00";

    @Builder.Default
    @Column(name = "quiet_hours_end", nullable = false, length = 5)
    private String quietHoursEnd = "07:00";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
