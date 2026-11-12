package com.example.fitsense.exercise.entity;

import com.example.fitsense.common.base.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "exercise_metrics")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseMetricEntity extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private ExerciseSessionEntity session;

    @Builder.Default
    @Column(name = "distance_m", nullable = false)
    private double distanceM = 0;

    @Builder.Default
    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds = 0;

    @Column(name = "avg_pace_sec_per_km")
    private Double avgPaceSecPerKm;

    @Column(name = "avg_speed_mps")
    private Double avgSpeedMps;

    @Builder.Default
    @Column(name = "calories", nullable = false)
    private double calories = 0;

    public void ensureGeneratedId() {
        ensureId();
    }
}
