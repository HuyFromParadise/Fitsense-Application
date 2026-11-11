package com.example.fitsense.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.example.fitsense.analytics.dto.PeriodAnalyticsResponse;
import com.example.fitsense.analytics.service.AnalyticsService;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.user.dto.UserResponse;
import com.example.fitsense.user.service.UserService;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private UserService userService;

    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(Instant.parse("2026-11-11T10:00:00Z"), ZoneOffset.UTC);
        analyticsService = new AnalyticsService(jdbcTemplate, userService, fixedClock);
    }

    @Test
    @SuppressWarnings("unchecked")
    void getWeeklyAnalytics_computesMondayToSundayBoundsAndBreakdown() {
        CurrentUser authUser = new CurrentUser("uid-1", "a@fitsense.app");
        when(userService.getOrCreateCurrentUser(authUser)).thenReturn(
                UserResponse.builder().id(UUID.randomUUID()).email("a@fitsense.app").build()
        );
        doNothing().when(jdbcTemplate)
                .query(anyString(), any(RowCallbackHandler.class), any(Object[].class));
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        PeriodAnalyticsResponse res = analyticsService.getWeeklyAnalytics(authUser, null);

        assertThat(res.periodStart()).isEqualTo(LocalDate.of(2026, 11, 9));
        assertThat(res.periodEnd()).isEqualTo(LocalDate.of(2026, 11, 15));
        assertThat(res.dailyBreakdown()).hasSize(7);
        assertThat(res.previous()).isNotNull();
        assertThat(res.previous().periodStart()).isEqualTo(LocalDate.of(2026, 11, 2));
    }

    @Test
    @SuppressWarnings("unchecked")
    void getMonthlyAnalytics_computesMonthBoundsAndPreviousMonth() {
        CurrentUser authUser = new CurrentUser("uid-1", "a@fitsense.app");
        when(userService.getOrCreateCurrentUser(authUser)).thenReturn(
                UserResponse.builder().id(UUID.randomUUID()).email("a@fitsense.app").build()
        );
        doNothing().when(jdbcTemplate)
                .query(anyString(), any(RowCallbackHandler.class), any(Object[].class));
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        PeriodAnalyticsResponse res = analyticsService.getMonthlyAnalytics(authUser, YearMonth.of(2026, 11));

        assertThat(res.periodStart()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(res.periodEnd()).isEqualTo(LocalDate.of(2026, 11, 30));
        assertThat(res.dailyBreakdown()).hasSize(30);
        assertThat(res.previous()).isNotNull();
        assertThat(res.previous().periodStart()).isEqualTo(LocalDate.of(2026, 10, 1));
    }

    @Test
    @SuppressWarnings("unchecked")
    void getWeeklyAnalytics_aggregatesStepsExercisesAndGoalRate() {
        CurrentUser authUser = new CurrentUser("uid-1", "a@fitsense.app");
        when(userService.getOrCreateCurrentUser(authUser)).thenReturn(
                UserResponse.builder().id(UUID.randomUUID()).email("a@fitsense.app").build()
        );

        LocalDate currentWeekStart = LocalDate.of(2026, 11, 9);
        LocalDate sampleDay = LocalDate.of(2026, 11, 10);
        Date currentActivityStart = Date.valueOf(currentWeekStart);
        Timestamp currentExerciseStart = Timestamp.from(currentWeekStart.atStartOfDay(ZoneOffset.UTC).toInstant());

        doAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            RowCallbackHandler handler = invocation.getArgument(1);
            Object startArg = invocation.getArgument(3);

            if (sql.contains("daily_activities") && currentActivityStart.equals(startArg)) {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getDate("activity_date")).thenReturn(Date.valueOf(sampleDay));
                when(rs.getLong("steps")).thenReturn(10000L);
                when(rs.getDouble("distance_m")).thenReturn(3000.0);
                when(rs.getDouble("calories")).thenReturn(400.0);
                when(rs.getInt("active_minutes")).thenReturn(45);
                handler.processRow(rs);
            } else if (sql.contains("exercise_sessions") && currentExerciseStart.equals(startArg)) {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getDate("session_date")).thenReturn(Date.valueOf(sampleDay));
                when(rs.getInt("session_count")).thenReturn(1);
                when(rs.getLong("total_duration")).thenReturn(1800L);
                when(rs.getDouble("total_distance")).thenReturn(5000.0);
                when(rs.getDouble("total_calories")).thenReturn(350.0);
                handler.processRow(rs);
            }
            return null;
        }).when(jdbcTemplate).query(anyString(), any(RowCallbackHandler.class), any(Object[].class));

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of(8000.0));

        PeriodAnalyticsResponse res = analyticsService.getWeeklyAnalytics(authUser, null);

        assertThat(res.totalSteps()).isEqualTo(10000L);
        assertThat(res.averageStepsPerDay()).isEqualTo(1428.6);
        assertThat(res.totalDistanceM()).isEqualTo(5000.0);
        assertThat(res.totalCalories()).isEqualTo(400.0);
        assertThat(res.totalActiveMinutes()).isEqualTo(45L);
        assertThat(res.totalExerciseCount()).isEqualTo(1);
        assertThat(res.totalExerciseSeconds()).isEqualTo(1800L);
        assertThat(res.bestDay()).isEqualTo(sampleDay);
        assertThat(res.goalCompletionRate()).isEqualTo(0.14);
        assertThat(res.previous().totalSteps()).isZero();
    }
}
