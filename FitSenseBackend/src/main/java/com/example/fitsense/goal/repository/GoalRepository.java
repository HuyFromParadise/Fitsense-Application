package com.example.fitsense.goal.repository;

import com.example.fitsense.goal.entity.GoalEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface GoalRepository extends JpaRepository<GoalEntity, UUID> {

    @Query("""
            select g from GoalEntity g
            where g.userId = :userId
              and g.enabled = true
              and g.startsOn <= :today
              and (g.endsOn is null or g.endsOn >= :today)
            order by g.createdAt desc
            """)
    List<GoalEntity> findActive(UUID userId, LocalDate today);
}
