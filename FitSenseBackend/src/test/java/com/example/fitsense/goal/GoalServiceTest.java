package com.example.fitsense.goal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.goal.dto.GoalResponse;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GoalServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 14);
    private static final CurrentUser AUTH_USER = new CurrentUser("uid-1", "a@fitsense.app");

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private UserService userService;

    private GoalService goalService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-11-14T08:00:00Z"), ZoneOffset.UTC);
        goalService = new GoalService(goalRepository, userService, clock);
    }

    private UUID stubUser(UUID userId) {
        when(userService.getOrCreateCurrentUser(AUTH_USER)).thenReturn(
                UserResponse.builder().id(userId).email("a@fitsense.app").build()
        );
        return userId;
    }

    private GoalEntity goal(UUID userId, LocalDate startsOn) {
        GoalEntity entity = GoalEntity.builder()
                .userId(userId)
                .type(GoalType.DAILY_STEPS)
                .targetValue(8000)
                .startsOn(startsOn)
                .enabled(true)
                .build();
        entity.setId(UUID.randomUUID());
        return entity;
    }

    @Test
    void create_defaultsStartsOnTodayAndEnabled() {
        UUID userId = stubUser(UUID.randomUUID());
        when(goalRepository.save(any(GoalEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        GoalResponse response = goalService.create(
                AUTH_USER, new GoalUpsertRequest(GoalType.DAILY_STEPS, 8000.0, null, null, null));

        assertThat(response.id()).isNotNull();
        assertThat(response.type()).isEqualTo(GoalType.DAILY_STEPS);
        assertThat(response.startsOn()).isEqualTo(TODAY);
        assertThat(response.endsOn()).isNull();
        assertThat(response.enabled()).isTrue();
        assertThat(response.targetValue()).isEqualTo(8000.0);
    }

    @Test
    void create_endsOnBeforeStartsOn_throwsValidation() {
        stubUser(UUID.randomUUID());

        assertThatThrownBy(() -> goalService.create(
                AUTH_USER,
                new GoalUpsertRequest(
                        GoalType.WEEKLY_EXERCISE_COUNT,
                        3.0,
                        LocalDate.of(2026, 11, 20),
                        LocalDate.of(2026, 11, 19),
                        true)))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode())
                        .isEqualTo(ErrorCode.VALIDATION_ERROR));
        verify(goalRepository, never()).save(any());
    }

    @Test
    void listActive_filtersByUserAndToday() {
        UUID userId = stubUser(UUID.randomUUID());
        GoalEntity entity = goal(userId, TODAY);
        when(goalRepository.findActive(userId, TODAY)).thenReturn(List.of(entity));

        List<GoalResponse> goals = goalService.listActive(AUTH_USER);

        assertThat(goals).hasSize(1);
        assertThat(goals.get(0).id()).isEqualTo(entity.getId());
        verify(goalRepository).findActive(eq(userId), eq(TODAY));
    }

    @Test
    void update_anotherUsersGoal_throwsForbidden() {
        stubUser(UUID.randomUUID());
        GoalEntity existing = goal(UUID.randomUUID(), TODAY);
        when(goalRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> goalService.update(
                AUTH_USER,
                existing.getId(),
                new GoalUpsertRequest(GoalType.DAILY_STEPS, 9000.0, TODAY, null, true)))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo(ErrorCode.FORBIDDEN));
        verify(goalRepository, never()).save(any());
    }

    @Test
    void update_missingGoal_throwsNotFound() {
        stubUser(UUID.randomUUID());
        UUID missingId = UUID.randomUUID();
        when(goalRepository.findById(missingId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> goalService.update(
                AUTH_USER,
                missingId,
                new GoalUpsertRequest(GoalType.DAILY_DISTANCE, 5.0, TODAY, null, true)))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }

    @Test
    void update_keepsStartsOnWhenRequestOmitsIt() {
        UUID userId = stubUser(UUID.randomUUID());
        GoalEntity existing = goal(userId, LocalDate.of(2026, 11, 1));
        when(goalRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
        when(goalRepository.save(any(GoalEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        GoalResponse response = goalService.update(
                AUTH_USER,
                existing.getId(),
                new GoalUpsertRequest(GoalType.DAILY_STEPS, 12000.0, null, null, null));

        assertThat(response.startsOn()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(response.targetValue()).isEqualTo(12000.0);
        assertThat(response.enabled()).isTrue();
    }

    @Test
    void delete_anotherUsersGoal_throwsForbidden() {
        stubUser(UUID.randomUUID());
        GoalEntity existing = goal(UUID.randomUUID(), TODAY);
        when(goalRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> goalService.delete(AUTH_USER, existing.getId()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo(ErrorCode.FORBIDDEN));
        verify(goalRepository, never()).delete(any());
    }

    @Test
    void delete_ownGoal_deletes() {
        UUID userId = stubUser(UUID.randomUUID());
        GoalEntity existing = goal(userId, TODAY);
        when(goalRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        goalService.delete(AUTH_USER, existing.getId());

        verify(goalRepository).delete(existing);
    }
}
