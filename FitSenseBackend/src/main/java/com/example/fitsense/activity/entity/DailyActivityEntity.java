package com.example.fitsense.activity.entity;

import com.example.fitsense.common.base.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "daily_activities")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyActivityEntity extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Column(name = "timezone_id", nullable = false, length = 64)
    private String timezoneId;

    @Builder.Default
    @Column(name = "steps", nullable = false)
    private int steps = 0;

    @Builder.Default
    @Column(name = "distance_m", nullable = false)
    private double distanceM = 0;

    @Builder.Default
    @Column(name = "calories", nullable = false)
    private double calories = 0;

    @Builder.Default
    @Column(name = "active_minutes", nullable = false)
    private int activeMinutes = 0;

    @Column(name = "client_updated_at", nullable = false)
    private Instant clientUpdatedAt;
}
