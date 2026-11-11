package com.example.fitsense.exercise.repository;

import com.example.fitsense.exercise.entity.ExerciseMetricEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExerciseMetricRepository extends JpaRepository<ExerciseMetricEntity, UUID> {
    Optional<ExerciseMetricEntity> findBySessionId(UUID sessionId);
}
