package com.example.fitsense.exercise;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.exercise.dto.ExerciseCreateRequest;
import com.example.fitsense.exercise.dto.GpsPointDto;
import com.example.fitsense.exercise.entity.ExerciseMetricEntity;
import com.example.fitsense.exercise.entity.ExerciseSessionEntity;
import com.example.fitsense.exercise.entity.ExerciseStatus;
import com.example.fitsense.exercise.entity.ExerciseType;
import com.example.fitsense.exercise.repository.ExerciseSessionRepository;
import com.example.fitsense.exercise.repository.GpsPointRepository;
import com.example.fitsense.exercise.service.ExerciseService;
import com.example.fitsense.exercise.service.ExerciseService.CreateSessionResult;
import com.example.fitsense.user.dto.UserResponse;
import com.example.fitsense.user.service.UserService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExerciseServiceTest {

    @Mock
    private ExerciseSessionRepository sessionRepository;

    @Mock
    private GpsPointRepository gpsPointRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private ExerciseService exerciseService;

    @Test
    void createSession_newSession_createsAndComputesFallbackMetrics() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        CurrentUser authUser = new CurrentUser("uid-1", "a@fitsense.app");

        when(userService.getOrCreateCurrentUser(authUser)).thenReturn(
                UserResponse.builder().id(userId).email("a@fitsense.app").weightKg(new BigDecimal("70.0")).build()
        );
        when(sessionRepository.findWithMetricsById(sessionId)).thenReturn(Optional.empty());
        when(sessionRepository.save(any(ExerciseSessionEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        Instant start = Instant.parse("2026-11-11T06:00:00Z");
        Instant end = Instant.parse("2026-11-11T06:30:00Z");

        ExerciseCreateRequest req = new ExerciseCreateRequest(
                sessionId,
                ExerciseType.RUNNING,
                ExerciseStatus.FINISHED,
                start,
                end,
                0,
                List.of(
                        new GpsPointDto(0, 10.776889, 106.700806, 10.0, 2.5, 5.0, start),
                        new GpsPointDto(1, 10.785889, 106.700806, 10.0, 2.5, 5.0, end)
                ),
                null
        );

        CreateSessionResult result = exerciseService.createSession(authUser, req);

        assertThat(result.created()).isTrue();
        assertThat(result.summary().id()).isEqualTo(sessionId);
        assertThat(result.summary().metrics().durationSeconds()).isEqualTo(1800);
        assertThat(result.summary().metrics().distanceM()).isGreaterThan(900.0);
        verify(gpsPointRepository).saveAll(anyList());
    }

    @Test
    void createSession_duplicateUuidSameUser_isIdempotent() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        CurrentUser authUser = new CurrentUser("uid-1", "a@fitsense.app");

        when(userService.getOrCreateCurrentUser(authUser)).thenReturn(
                UserResponse.builder().id(userId).email("a@fitsense.app").build()
        );

        ExerciseSessionEntity existing = ExerciseSessionEntity.builder()
                .userId(userId)
                .exerciseType(ExerciseType.WALKING)
                .status(ExerciseStatus.FINISHED)
                .startedAt(Instant.now())
                .metrics(ExerciseMetricEntity.builder().distanceM(500).durationSeconds(400).calories(30).build())
                .build();
        existing.setId(sessionId);

        when(sessionRepository.findWithMetricsById(sessionId)).thenReturn(Optional.of(existing));

        ExerciseCreateRequest req = new ExerciseCreateRequest(
                sessionId, ExerciseType.WALKING, ExerciseStatus.FINISHED, Instant.now(), null, 0, null, null
        );

        CreateSessionResult result = exerciseService.createSession(authUser, req);

        assertThat(result.created()).isFalse();
        assertThat(result.summary().id()).isEqualTo(sessionId);
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void getSessionDetail_anotherUser_throwsForbidden() {
        UUID ownerId = UUID.randomUUID();
        UUID attackerId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        CurrentUser attacker = new CurrentUser("uid-attacker", "attacker@fitsense.app");

        when(userService.getOrCreateCurrentUser(attacker)).thenReturn(
                UserResponse.builder().id(attackerId).email("attacker@fitsense.app").build()
        );

        ExerciseSessionEntity existing = ExerciseSessionEntity.builder()
                .userId(ownerId)
                .exerciseType(ExerciseType.RUNNING)
                .status(ExerciseStatus.FINISHED)
                .startedAt(Instant.now())
                .build();
        existing.setId(sessionId);

        when(sessionRepository.findWithMetricsById(sessionId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> exerciseService.getSessionDetail(attacker, sessionId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }
}
