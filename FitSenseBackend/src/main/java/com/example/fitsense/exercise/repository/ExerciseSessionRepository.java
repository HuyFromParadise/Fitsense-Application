package com.example.fitsense.exercise.repository;

import com.example.fitsense.exercise.entity.ExerciseSessionEntity;
import com.example.fitsense.exercise.entity.ExerciseType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExerciseSessionRepository extends JpaRepository<ExerciseSessionEntity, UUID> {

    @EntityGraph(attributePaths = {"metrics"})
    Page<ExerciseSessionEntity> findByUserIdOrderByStartedAtDesc(UUID userId, Pageable pageable);

    @EntityGraph(attributePaths = {"metrics"})
    Page<ExerciseSessionEntity> findByUserIdAndExerciseTypeOrderByStartedAtDesc(
            UUID userId, ExerciseType exerciseType, Pageable pageable);

    @EntityGraph(attributePaths = {"metrics"})
    Optional<ExerciseSessionEntity> findWithMetricsById(UUID id);
}
