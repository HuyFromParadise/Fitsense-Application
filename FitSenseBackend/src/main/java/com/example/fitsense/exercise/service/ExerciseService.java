package com.example.fitsense.exercise.service;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.response.PageResponse;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.exercise.dto.ExerciseCreateRequest;
import com.example.fitsense.exercise.dto.ExerciseDetailResponse;
import com.example.fitsense.exercise.dto.ExerciseMetricsDto;
import com.example.fitsense.exercise.dto.ExerciseSummaryResponse;
import com.example.fitsense.exercise.dto.ExerciseUpdateRequest;
import com.example.fitsense.exercise.dto.GpsPointDto;
import com.example.fitsense.exercise.entity.ExerciseMetricEntity;
import com.example.fitsense.exercise.entity.ExerciseSessionEntity;
import com.example.fitsense.exercise.entity.ExerciseType;
import com.example.fitsense.exercise.entity.GpsPointEntity;
import com.example.fitsense.exercise.repository.ExerciseSessionRepository;
import com.example.fitsense.exercise.repository.GpsPointRepository;
import com.example.fitsense.user.dto.UserResponse;
import com.example.fitsense.user.service.UserService;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExerciseService {

    private final ExerciseSessionRepository sessionRepository;
    private final GpsPointRepository gpsPointRepository;
    private final UserService userService;

    public record CreateSessionResult(ExerciseSummaryResponse summary, boolean created) {}

    @Transactional
    public CreateSessionResult createSession(CurrentUser authUser, ExerciseCreateRequest request) {
        UserResponse currentUser = userService.getOrCreateCurrentUser(authUser);
        UUID userId = currentUser.id();

        Optional<ExerciseSessionEntity> existingOpt = sessionRepository.findWithMetricsById(request.id());
        if (existingOpt.isPresent()) {
            ExerciseSessionEntity existing = existingOpt.get();
            if (!existing.getUserId().equals(userId)) {
                throw new ApiException(ErrorCode.FORBIDDEN, "Exercise session belongs to another user");
            }
            log.info("Idempotent exercise create hit for session={}", existing.getId());
            return new CreateSessionResult(ExerciseSummaryResponse.fromEntity(existing), false);
        }

        if (request.endedAt() != null && request.endedAt().isBefore(request.startedAt())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "endedAt must not be before startedAt");
        }

        int pausedSec = request.pausedSeconds() != null ? request.pausedSeconds() : 0;

        ExerciseSessionEntity session = ExerciseSessionEntity.builder()
                .userId(userId)
                .exerciseType(request.type())
                .status(request.status())
                .startedAt(request.startedAt())
                .endedAt(request.endedAt())
                .pausedSeconds(pausedSec)
                .build();
        session.setId(request.id());

        ExerciseMetricEntity metricEntity = buildMetrics(
                request.type(),
                request.startedAt(),
                request.endedAt(),
                pausedSec,
                request.gpsPoints(),
                request.metrics(),
                currentUser.weightKg() != null ? currentUser.weightKg().doubleValue() : 70.0
        );
        metricEntity.ensureGeneratedId();
        session.attachMetrics(metricEntity);

        ExerciseSessionEntity savedSession = sessionRepository.save(session);

        if (request.gpsPoints() != null && !request.gpsPoints().isEmpty()) {
            List<GpsPointEntity> entities = deduplicatePoints(request.gpsPoints(), Set.of(), savedSession);
            gpsPointRepository.saveAll(entities);
        }

        log.info("Created exercise session id={} user={} type={} points={}",
                savedSession.getId(), userId, savedSession.getExerciseType(),
                request.gpsPoints() != null ? request.gpsPoints().size() : 0);

        return new CreateSessionResult(ExerciseSummaryResponse.fromEntity(savedSession), true);
    }

    @Transactional(readOnly = true)
    public PageResponse<ExerciseSummaryResponse> listSessions(
            CurrentUser authUser,
            ExerciseType type,
            Pageable pageable
    ) {
        UUID userId = userService.getOrCreateCurrentUser(authUser).id();
        Page<ExerciseSessionEntity> page = (type != null)
                ? sessionRepository.findByUserIdAndExerciseTypeOrderByStartedAtDesc(userId, type, pageable)
                : sessionRepository.findByUserIdOrderByStartedAtDesc(userId, pageable);

        return PageResponse.from(page.map(ExerciseSummaryResponse::fromEntity));
    }

    @Transactional(readOnly = true)
    public ExerciseDetailResponse getSessionDetail(CurrentUser authUser, UUID sessionId) {
        UUID userId = userService.getOrCreateCurrentUser(authUser).id();
        ExerciseSessionEntity session = findOwnedSession(sessionId, userId);
        List<GpsPointEntity> points = gpsPointRepository.findBySessionIdOrderBySeqAsc(sessionId);
        return ExerciseDetailResponse.fromEntity(session, points);
    }

    @Transactional
    public ExerciseSummaryResponse updateSession(
            CurrentUser authUser,
            UUID sessionId,
            ExerciseUpdateRequest request
    ) {
        UserResponse currentUser = userService.getOrCreateCurrentUser(authUser);
        ExerciseSessionEntity session = findOwnedSession(sessionId, currentUser.id());

        if (request.endedAt() != null && request.endedAt().isBefore(session.getStartedAt())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "endedAt must not be before startedAt");
        }

        session.setStatus(request.status());
        if (request.endedAt() != null) {
            session.setEndedAt(request.endedAt());
        }
        if (request.pausedSeconds() != null) {
            session.setPausedSeconds(request.pausedSeconds());
        }

        if (request.gpsPoints() != null && !request.gpsPoints().isEmpty()) {
            Set<Integer> existingSeqs = gpsPointRepository.findExistingSeqsBySessionId(sessionId);
            List<GpsPointEntity> newPoints = deduplicatePoints(request.gpsPoints(), existingSeqs, session);
            if (!newPoints.isEmpty()) {
                gpsPointRepository.saveAll(newPoints);
            }
        }

        if (request.metrics() != null) {
            ExerciseMetricEntity metricEntity = session.getMetrics();
            if (metricEntity == null) {
                metricEntity = new ExerciseMetricEntity();
                metricEntity.ensureGeneratedId();
                session.attachMetrics(metricEntity);
            }
            applyMetricsDto(metricEntity, request.metrics());
        }

        ExerciseSessionEntity updated = sessionRepository.save(session);
        return ExerciseSummaryResponse.fromEntity(updated);
    }

    private ExerciseSessionEntity findOwnedSession(UUID sessionId, UUID userId) {
        ExerciseSessionEntity session = sessionRepository.findWithMetricsById(sessionId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Exercise session not found"));
        if (!session.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Access denied to this exercise session");
        }
        return session;
    }

    private List<GpsPointEntity> deduplicatePoints(
            List<GpsPointDto> dtos,
            Set<Integer> existingSeqs,
            ExerciseSessionEntity session
    ) {
        Set<Integer> seen = new HashSet<>(existingSeqs);
        List<GpsPointEntity> entities = new ArrayList<>();
        for (GpsPointDto dto : dtos) {
            if (seen.add(dto.seq())) {
                GpsPointEntity entity = dto.toEntity();
                entity.setSession(session);
                entities.add(entity);
            }
        }
        return entities;
    }

    private ExerciseMetricEntity buildMetrics(
            ExerciseType type,
            java.time.Instant startedAt,
            java.time.Instant endedAt,
            int pausedSeconds,
            List<GpsPointDto> points,
            ExerciseMetricsDto dto,
            double userWeightKg
    ) {
        ExerciseMetricEntity entity = new ExerciseMetricEntity();
        if (dto != null) {
            applyMetricsDto(entity, dto);
            return entity;
        }

        double distanceM = computeDistanceFromPoints(points);
        int durationSec = 0;
        if (endedAt != null && startedAt != null) {
            durationSec = (int) Math.max(0, Duration.between(startedAt, endedAt).getSeconds() - pausedSeconds);
        }
        double avgSpeed = durationSec > 0 ? distanceM / durationSec : 0.0;
        Double avgPace = distanceM > 0 ? (durationSec / (distanceM / 1000.0)) : null;
        double met = switch (type) {
            case WALKING -> 3.5;
            case RUNNING -> 8.5;
            case CYCLING -> 7.5;
        };
        double calories = met * userWeightKg * (durationSec / 3600.0);

        entity.setDistanceM(distanceM);
        entity.setDurationSeconds(durationSec);
        entity.setAvgSpeedMps(avgSpeed);
        entity.setAvgPaceSecPerKm(avgPace);
        entity.setCalories(Math.round(calories * 10.0) / 10.0);
        return entity;
    }

    private void applyMetricsDto(ExerciseMetricEntity entity, ExerciseMetricsDto dto) {
        entity.setDistanceM(dto.distanceM());
        entity.setDurationSeconds(dto.durationSeconds());
        entity.setAvgPaceSecPerKm(dto.avgPaceSecPerKm());
        entity.setAvgSpeedMps(dto.avgSpeedMps());
        entity.setCalories(dto.calories());
    }

    private double computeDistanceFromPoints(List<GpsPointDto> points) {
        if (points == null || points.size() < 2) {
            return 0.0;
        }
        List<GpsPointDto> sorted = points.stream()
                .sorted(Comparator.comparingInt(GpsPointDto::seq))
                .toList();
        double total = 0.0;
        for (int i = 1; i < sorted.size(); i++) {
            GpsPointDto prev = sorted.get(i - 1);
            GpsPointDto curr = sorted.get(i);
            total += haversineMeters(prev.latitude(), prev.longitude(), curr.latitude(), curr.longitude());
        }
        return Math.round(total * 100.0) / 100.0;
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
