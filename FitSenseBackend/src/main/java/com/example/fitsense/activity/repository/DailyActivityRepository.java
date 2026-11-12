package com.example.fitsense.activity.repository;

import com.example.fitsense.activity.entity.DailyActivityEntity;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DailyActivityRepository extends JpaRepository<DailyActivityEntity, UUID> {

    Optional<DailyActivityEntity> findByUserIdAndActivityDate(UUID userId, LocalDate activityDate);

    @Query("""
            SELECT a FROM DailyActivityEntity a
            WHERE a.userId = :userId
              AND (:from IS NULL OR a.activityDate >= :from)
              AND (:to IS NULL OR a.activityDate <= :to)
            ORDER BY a.activityDate DESC
            """)
    Page<DailyActivityEntity> findHistory(
            @Param("userId") UUID userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            Pageable pageable);
}
