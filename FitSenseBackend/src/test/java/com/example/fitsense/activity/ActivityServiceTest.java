package com.example.fitsense.activity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.fitsense.activity.dto.DailyActivityResponse;
import com.example.fitsense.activity.entity.DailyActivityEntity;
import com.example.fitsense.activity.repository.DailyActivityRepository;
import com.example.fitsense.activity.service.ActivityService;
import com.example.fitsense.common.response.PageResponse;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.user.dto.UserResponse;
import com.example.fitsense.user.service.UserService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    @Mock
    private DailyActivityRepository activityRepository;

    @Mock
    private UserService userService;

    private ActivityService activityService;

    private final CurrentUser authUser = new CurrentUser("firebase-uid", "user@example.com");
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        activityService = new ActivityService(activityRepository, userService);
        when(userService.getOrCreateCurrentUser(authUser))
                .thenReturn(UserResponse.builder().id(userId).build());
    }

    @Test
    void getDailyReturnsStoredActivityForCurrentUser() {
        LocalDate date = LocalDate.of(2026, 11, 12);
        DailyActivityEntity entity = DailyActivityEntity.builder()
                .userId(userId)
                .activityDate(date)
                .timezoneId("Asia/Ho_Chi_Minh")
                .steps(8234)
                .distanceM(6100.5)
                .calories(312.75)
                .activeMinutes(82)
                .clientUpdatedAt(Instant.parse("2026-11-12T03:00:00Z"))
                .build();
        entity.setId(UUID.randomUUID());
        entity.setUpdatedAt(Instant.parse("2026-11-12T03:00:01Z"));

        when(activityRepository.findByUserIdAndActivityDate(userId, date))
                .thenReturn(Optional.of(entity));

        DailyActivityResponse response = activityService.getDaily(authUser, date, null);

        assertThat(response.id()).isEqualTo(entity.getId());
        assertThat(response.activityDate()).isEqualTo(date);
        assertThat(response.timezoneId()).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(response.steps()).isEqualTo(8234);
        assertThat(response.distanceM()).isEqualTo(6100.5);
        assertThat(response.calories()).isEqualTo(312.75);
        assertThat(response.activeMinutes()).isEqualTo(82);
        assertThat(response.updatedAt()).isEqualTo(entity.getUpdatedAt());
    }

    @Test
    void getDailyReturnsZeroedActivityWhenNoRowExists() {
        LocalDate date = LocalDate.of(2026, 11, 12);
        when(activityRepository.findByUserIdAndActivityDate(userId, date))
                .thenReturn(Optional.empty());

        DailyActivityResponse response = activityService.getDaily(authUser, date, "Asia/Ho_Chi_Minh");

        assertThat(response.id()).isNull();
        assertThat(response.activityDate()).isEqualTo(date);
        assertThat(response.timezoneId()).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(response.steps()).isZero();
        assertThat(response.distanceM()).isZero();
        assertThat(response.calories()).isZero();
        assertThat(response.activeMinutes()).isZero();
        assertThat(response.updatedAt()).isNotNull();
    }

    @Test
    void getHistoryReturnsPagedRowsForCurrentUser() {
        LocalDate from = LocalDate.of(2026, 11, 01);
        LocalDate to = LocalDate.of(2026, 11, 12);
        DailyActivityEntity first = DailyActivityEntity.builder()
                .userId(userId)
                .activityDate(LocalDate.of(2026, 11, 12))
                .timezoneId("Asia/Ho_Chi_Minh")
                .steps(8000)
                .distanceM(6000)
                .calories(300)
                .activeMinutes(80)
                .clientUpdatedAt(Instant.parse("2026-11-12T03:00:00Z"))
                .build();
        DailyActivityEntity second = DailyActivityEntity.builder()
                .userId(userId)
                .activityDate(LocalDate.of(2026, 11, 11))
                .timezoneId("Asia/Ho_Chi_Minh")
                .steps(4000)
                .distanceM(3000)
                .calories(150)
                .activeMinutes(40)
                .clientUpdatedAt(Instant.parse("2026-11-11T03:00:00Z"))
                .build();
        Pageable pageable = PageRequest.of(0, 2);
        Page<DailyActivityEntity> page = new PageImpl<>(List.of(first, second), pageable, 5);

        when(activityRepository.findHistory(eq(userId), eq(from), eq(to), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<DailyActivityResponse> response =
                activityService.getHistory(authUser, from, to, 0, 2);

        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).activityDate()).isEqualTo(LocalDate.of(2026, 11, 12));
        assertThat(response.items().get(1).steps()).isEqualTo(4000);
        assertThat(response.page()).isZero();
        assertThat(response.size()).isEqualTo(2);
        assertThat(response.totalItems()).isEqualTo(5);
        assertThat(response.totalPages()).isEqualTo(3);
        assertThat(response.hasNext()).isTrue();
        verify(activityRepository).findHistory(eq(userId), eq(from), eq(to), any(Pageable.class));
    }

    @Test
    void getHistoryPassesNullBoundsThrough() {
        Pageable pageable = PageRequest.of(0, 20);
        when(activityRepository.findHistory(eq(userId), eq(null), eq(null), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        PageResponse<DailyActivityResponse> response =
                activityService.getHistory(authUser, null, null, 0, 20);

        assertThat(response.items()).isEmpty();
        assertThat(response.totalItems()).isZero();
        assertThat(response.hasNext()).isFalse();
    }
}
