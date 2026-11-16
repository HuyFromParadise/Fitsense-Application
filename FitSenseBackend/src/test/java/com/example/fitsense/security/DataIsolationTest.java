package com.example.fitsense.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.exercise.dto.ExerciseCreateRequest;
import com.example.fitsense.exercise.dto.ExerciseUpdateRequest;
import com.example.fitsense.exercise.entity.ExerciseSessionEntity;
import com.example.fitsense.exercise.entity.ExerciseStatus;
import com.example.fitsense.exercise.entity.ExerciseType;
import com.example.fitsense.exercise.repository.ExerciseSessionRepository;
import com.example.fitsense.exercise.repository.GpsPointRepository;
import com.example.fitsense.exercise.service.ExerciseService;
import com.example.fitsense.goal.dto.GoalUpsertRequest;
import com.example.fitsense.goal.entity.GoalEntity;
import com.example.fitsense.goal.entity.GoalType;
import com.example.fitsense.goal.repository.GoalRepository;
import com.example.fitsense.goal.service.GoalService;
import com.example.fitsense.user.dto.UserResponse;
import com.example.fitsense.user.service.UserService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * AC-13 Data Isolation:
 * Verifies that User A cannot read, update, or overwrite exercise sessions or goals belonging to User B.
 */
@ExtendWith(MockitoExtension.class)
class DataIsolationTest {

    @Mock
    private ExerciseSessionRepository sessionRepository;

    @Mock
    private GpsPointRepository gpsPointRepository;

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private UserService userService;

    private ExerciseService exerciseService;
    private GoalService goalService;

    private final UUID userAId = UUID.randomUUID();
    private final UUID userBId = UUID.randomUUID();
    private final CurrentUser userAAuth = new CurrentUser("uid-user-a", "userA@fitsense.app");

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-11-16T08:00:00Z"), ZoneOffset.UTC);
        exerciseService = new ExerciseService(sessionRepository, gpsPointRepository, userService);
        goalService = new GoalService(goalRepository, userService, clock);

        UserResponse userAResponse = UserResponse.builder()
                .id(userAId)
                .email("userA@fitsense.app")
                .displayName("User A")
                .build();
        when(userService.getOrCreateCurrentUser(userAAuth)).thenReturn(userAResponse);
    }

    @Test
    @DisplayName("AC-13: User A cannot read User B's exercise session detail (FORBIDDEN)")
    void getSessionDetail_otherUsersSession_throwsForbidden() {
        UUID sessionId = UUID.randomUUID();
        ExerciseSessionEntity sessionB = ExerciseSessionEntity.builder()
                .userId(userBId)
                .exerciseType(ExerciseType.RUNNING)
                .status(ExerciseStatus.FINISHED)
                .startedAt(Instant.now().minusSeconds(1800))
                .endedAt(Instant.now())
                .pausedSeconds(0)
                .build();
        sessionB.setId(sessionId);

        when(sessionRepository.findWithMetricsById(sessionId)).thenReturn(Optional.of(sessionB));

        assertThatThrownBy(() -> exerciseService.getSessionDetail(userAAuth, sessionId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    @DisplayName("AC-13: User A cannot update User B's exercise session (FORBIDDEN)")
    void updateSession_otherUsersSession_throwsForbidden() {
        UUID sessionId = UUID.randomUUID();
        ExerciseSessionEntity sessionB = ExerciseSessionEntity.builder()
                .userId(userBId)
                .exerciseType(ExerciseType.CYCLING)
                .status(ExerciseStatus.PAUSED)
                .startedAt(Instant.now().minusSeconds(1200))
                .build();
        sessionB.setId(sessionId);

        when(sessionRepository.findWithMetricsById(sessionId)).thenReturn(Optional.of(sessionB));

        ExerciseUpdateRequest updateReq = new ExerciseUpdateRequest(
                ExerciseStatus.FINISHED,
                Instant.now(),
                0,
                List.of(),
                null
        );

        assertThatThrownBy(() -> exerciseService.updateSession(userAAuth, sessionId, updateReq))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    @DisplayName("AC-13: User A cannot overwrite an existing session belonging to User B (FORBIDDEN)")
    void createSession_collidingWithOtherUserSession_throwsForbidden() {
        UUID sessionId = UUID.randomUUID();
        ExerciseSessionEntity sessionB = ExerciseSessionEntity.builder()
                .userId(userBId)
                .exerciseType(ExerciseType.WALKING)
                .status(ExerciseStatus.FINISHED)
                .startedAt(Instant.now().minusSeconds(600))
                .endedAt(Instant.now())
                .build();
        sessionB.setId(sessionId);

        when(sessionRepository.findWithMetricsById(sessionId)).thenReturn(Optional.of(sessionB));

        ExerciseCreateRequest createReq = new ExerciseCreateRequest(
                sessionId,
                ExerciseType.WALKING,
                ExerciseStatus.FINISHED,
                Instant.now().minusSeconds(600),
                Instant.now(),
                0,
                List.of(),
                null
        );

        assertThatThrownBy(() -> exerciseService.createSession(userAAuth, createReq))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    @DisplayName("AC-13: User A cannot update User B's fitness goal (FORBIDDEN)")
    void updateGoal_otherUsersGoal_throwsForbidden() {
        UUID goalId = UUID.randomUUID();
        GoalEntity goalB = GoalEntity.builder()
                .userId(userBId)
                .type(GoalType.DAILY_STEPS)
                .targetValue(10000.0)
                .startsOn(LocalDate.now())
                .enabled(true)
                .build();
        goalB.setId(goalId);

        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goalB));

        GoalUpsertRequest updateReq = new GoalUpsertRequest(
                GoalType.DAILY_STEPS,
                12000.0,
                LocalDate.now(),
                null,
                true
        );

        assertThatThrownBy(() -> goalService.update(userAAuth, goalId, updateReq))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    @DisplayName("AC-13: User A cannot delete User B's fitness goal (FORBIDDEN)")
    void deleteGoal_otherUsersGoal_throwsForbidden() {
        UUID goalId = UUID.randomUUID();
        GoalEntity goalB = GoalEntity.builder()
                .userId(userBId)
                .type(GoalType.DAILY_DISTANCE)
                .targetValue(25.0)
                .startsOn(LocalDate.now())
                .enabled(true)
                .build();
        goalB.setId(goalId);

        when(goalRepository.findById(goalId)).thenReturn(Optional.of(goalB));

        assertThatThrownBy(() -> goalService.delete(userAAuth, goalId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }
}
