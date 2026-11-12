package com.example.fitsense.exercise.repository;

import com.example.fitsense.exercise.entity.GpsPointEntity;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface GpsPointRepository extends JpaRepository<GpsPointEntity, Long> {

    List<GpsPointEntity> findBySessionIdOrderBySeqAsc(UUID sessionId);

    @Query("SELECT g.seq FROM GpsPointEntity g WHERE g.session.id = :sessionId")
    Set<Integer> findExistingSeqsBySessionId(@Param("sessionId") UUID sessionId);
}
