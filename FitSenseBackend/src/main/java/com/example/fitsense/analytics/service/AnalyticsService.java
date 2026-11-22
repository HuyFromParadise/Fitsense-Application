package com.example.fitsense.analytics.service;

import com.example.fitsense.analytics.dto.DailyBreakdownDto;
import com.example.fitsense.analytics.dto.PeriodAnalyticsResponse;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.user.service.UserService;
import java.nio.ByteBuffer;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final JdbcTemplate jdbcTemplate;
    private final UserService userService;
    private final Clock clock;

    @Transactional(readOnly = true)
    public PeriodAnalyticsResponse getWeeklyAnalytics(CurrentUser authUser, LocalDate weekStart) {
        return getWeeklyAnalytics(authUser, weekStart, null);
    }

    @Transactional(readOnly = true)
    public PeriodAnalyticsResponse getWeeklyAnalytics(
            CurrentUser authUser, LocalDate weekStart, String timezoneId) {
        UUID userId = userService.getOrCreateCurrentUser(authUser).id();
        ZoneId zone = resolveZone(uuidToBytes(userId), timezoneId);
        LocalDate effectiveStart = (weekStart != null)
                ? weekStart.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                : LocalDate.now(clock.withZone(zone)).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate effectiveEnd = effectiveStart.plusDays(6);

        LocalDate prevStart = effectiveStart.minusWeeks(1);
        LocalDate prevEnd = effectiveEnd.minusWeeks(1);

        PeriodAnalyticsResponse previous = computePeriod(userId, prevStart, prevEnd, zone, null, false);
        return computePeriod(userId, effectiveStart, effectiveEnd, zone, previous, true);
    }

    @Transactional(readOnly = true)
    public PeriodAnalyticsResponse getMonthlyAnalytics(CurrentUser authUser, YearMonth month) {
        return getMonthlyAnalytics(authUser, month, null);
    }

    @Transactional(readOnly = true)
    public PeriodAnalyticsResponse getMonthlyAnalytics(
            CurrentUser authUser, YearMonth month, String timezoneId) {
        UUID userId = userService.getOrCreateCurrentUser(authUser).id();
        ZoneId zone = resolveZone(uuidToBytes(userId), timezoneId);
        YearMonth effectiveMonth = (month != null) ? month : YearMonth.now(clock.withZone(zone));
        LocalDate effectiveStart = effectiveMonth.atDay(1);
        LocalDate effectiveEnd = effectiveMonth.atEndOfMonth();

        YearMonth prevMonth = effectiveMonth.minusMonths(1);
        LocalDate prevStart = prevMonth.atDay(1);
        LocalDate prevEnd = prevMonth.atEndOfMonth();

        PeriodAnalyticsResponse previous = computePeriod(userId, prevStart, prevEnd, zone, null, false);
        return computePeriod(userId, effectiveStart, effectiveEnd, zone, previous, true);
    }

    private PeriodAnalyticsResponse computePeriod(
            UUID userId,
            LocalDate start,
            LocalDate end,
            ZoneId zone,
            PeriodAnalyticsResponse previous,
            boolean includeBreakdown
    ) {
        byte[] userIdBytes = uuidToBytes(userId);

        // 1. Read daily_activities (owned by B, read-only query by A)
        Map<LocalDate, DailyActivityRow> activityByDate = queryDailyActivities(userIdBytes, start, end);

        // 2. Read finished exercise_sessions + exercise_metrics grouped in the user's ZoneId
        Map<LocalDate, ExerciseAggregateRow> exerciseByDate = queryExercises(userIdBytes, start, end, zone);

        // 3. Read active daily step goal if available (from V2 goals table)
        Double dailyStepGoal = queryDailyStepGoal(userIdBytes);

        long totalSteps = 0;
        double totalDistanceM = 0;
        double totalCalories = 0;
        long totalActiveMinutes = 0;
        int totalExerciseCount = 0;
        long totalExerciseSeconds = 0;

        LocalDate bestDay = null;
        long maxDayScore = -1;
        int daysMeetingGoal = 0;

        List<DailyBreakdownDto> breakdown = new ArrayList<>();
        long daysInPeriod = ChronoUnit.DAYS.between(start, end) + 1;

        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            DailyActivityRow act = activityByDate.get(d);
            ExerciseAggregateRow ex = exerciseByDate.get(d);

            long steps = act != null ? act.steps() : 0L;
            double exDistance = ex != null ? ex.distanceM() : 0.0;
            double actDistance = act != null ? act.distanceM() : 0.0;
            double distanceM = Math.max(actDistance, exDistance);

            double exCalories = ex != null ? ex.calories() : 0.0;
            double actCalories = act != null ? act.calories() : 0.0;
            double calories = Math.max(actCalories, exCalories);

            int exMinutes = ex != null ? (int) (ex.durationSeconds() / 60) : 0;
            int activeMinutes = act != null ? Math.max(act.activeMinutes(), exMinutes) : exMinutes;
            int exCount = ex != null ? ex.count() : 0;
            long exSec = ex != null ? ex.durationSeconds() : 0L;

            totalSteps += steps;
            totalDistanceM += distanceM;
            totalCalories += calories;
            totalActiveMinutes += activeMinutes;
            totalExerciseCount += exCount;
            totalExerciseSeconds += exSec;

            // Best day uses steps if present, otherwise exercise distance
            long dayScore = steps > 0 ? steps : (long) distanceM;
            if (dayScore > maxDayScore && dayScore > 0) {
                maxDayScore = dayScore;
                bestDay = d;
            }

            if (dailyStepGoal != null && dailyStepGoal > 0 && steps >= dailyStepGoal) {
                daysMeetingGoal++;
            }

            if (includeBreakdown) {
                breakdown.add(DailyBreakdownDto.builder()
                        .date(d)
                        .steps(steps)
                        .distanceM(Math.round(distanceM * 100.0) / 100.0)
                        .calories(Math.round(calories * 10.0) / 10.0)
                        .activeMinutes(activeMinutes)
                        .exerciseCount(exCount)
                        .build());
            }
        }

        double avgSteps = daysInPeriod > 0 ? Math.round(((double) totalSteps / daysInPeriod) * 10.0) / 10.0 : 0.0;
        double goalCompletionRate = (dailyStepGoal != null && dailyStepGoal > 0 && daysInPeriod > 0)
                ? Math.min(1.0, Math.round(((double) daysMeetingGoal / daysInPeriod) * 100.0) / 100.0)
                : 0.0;

        return PeriodAnalyticsResponse.builder()
                .periodStart(start)
                .periodEnd(end)
                .totalSteps(totalSteps)
                .averageStepsPerDay(avgSteps)
                .totalDistanceM(Math.round(totalDistanceM * 100.0) / 100.0)
                .totalCalories(Math.round(totalCalories * 10.0) / 10.0)
                .totalActiveMinutes(totalActiveMinutes)
                .totalExerciseCount(totalExerciseCount)
                .totalExerciseSeconds(totalExerciseSeconds)
                .bestDay(bestDay)
                .goalCompletionRate(goalCompletionRate)
                .previous(previous)
                .dailyBreakdown(includeBreakdown ? breakdown : null)
                .build();
    }

    private record DailyActivityRow(long steps, double distanceM, double calories, int activeMinutes) {}

    private record ExerciseAggregateRow(int count, long durationSeconds, double distanceM, double calories) {}

    private Map<LocalDate, DailyActivityRow> queryDailyActivities(byte[] userIdBytes, LocalDate start, LocalDate end) {
        Map<LocalDate, DailyActivityRow> map = new HashMap<>();
        String sql = """
                SELECT activity_date, steps, distance_m, calories, active_minutes
                FROM daily_activities
                WHERE user_id = ? AND activity_date BETWEEN ? AND ?
                """;
        try {
            jdbcTemplate.query(
                    sql,
                    rs -> {
                        LocalDate date = rs.getDate("activity_date").toLocalDate();
                        long steps = rs.getLong("steps");
                        double distanceM = rs.getDouble("distance_m");
                        double calories = rs.getDouble("calories");
                        int activeMinutes = rs.getInt("active_minutes");
                        map.put(date, new DailyActivityRow(steps, distanceM, calories, activeMinutes));
                    },
                    userIdBytes,
                    Date.valueOf(start),
                    Date.valueOf(end)
            );
        } catch (Exception e) {
            log.debug("Could not query daily_activities: {}", e.getMessage());
        }
        return map;
    }

    private Map<LocalDate, ExerciseAggregateRow> queryExercises(
            byte[] userIdBytes, LocalDate start, LocalDate end, ZoneId zone) {
        Map<LocalDate, ExerciseAggregateRow> map = new HashMap<>();
        String sql = """
                SELECT s.started_at,
                       COALESCE(m.duration_seconds, 0) AS duration_seconds,
                       COALESCE(m.distance_m, 0) AS distance_m,
                       COALESCE(m.calories, 0) AS calories
                FROM exercise_sessions s
                LEFT JOIN exercise_metrics m ON s.id = m.session_id
                WHERE s.user_id = ?
                  AND s.status = 'FINISHED'
                  AND s.started_at >= ?
                  AND s.started_at < ?
                """;
        try {
            jdbcTemplate.query(
                    sql,
                    rs -> {
                        Timestamp startedAt = rs.getTimestamp("started_at");
                        if (startedAt == null) return;
                        LocalDate date = startedAt.toInstant().atZone(zone).toLocalDate();
                        long duration = rs.getLong("duration_seconds");
                        double distance = rs.getDouble("distance_m");
                        double calories = rs.getDouble("calories");
                        map.merge(
                                date,
                                new ExerciseAggregateRow(1, duration, distance, calories),
                                (a, b) -> new ExerciseAggregateRow(
                                        a.count() + b.count(),
                                        a.durationSeconds() + b.durationSeconds(),
                                        a.distanceM() + b.distanceM(),
                                        a.calories() + b.calories()));
                    },
                    userIdBytes,
                    Timestamp.from(start.atStartOfDay(zone).toInstant()),
                    Timestamp.from(end.plusDays(1).atStartOfDay(zone).toInstant())
            );
        } catch (Exception e) {
            log.warn("Could not query exercise_sessions for analytics: {}", e.getMessage());
        }
        return map;
    }

    private ZoneId resolveZone(byte[] userIdBytes, String requestedTimezoneId) {
        if (requestedTimezoneId != null && !requestedTimezoneId.isBlank()) {
            try {
                return ZoneId.of(requestedTimezoneId.trim());
            } catch (RuntimeException ignored) {
                log.debug("Ignoring invalid timezoneId '{}', falling back", requestedTimezoneId);
            }
        }
        try {
            List<String> zones = jdbcTemplate.query(
                    "SELECT timezone_id FROM daily_activities WHERE user_id = ? ORDER BY activity_date DESC LIMIT 1",
                    (rs, rowNum) -> rs.getString("timezone_id"),
                    userIdBytes);
            if (!zones.isEmpty() && zones.get(0) != null && !zones.get(0).isBlank()) {
                return ZoneId.of(zones.get(0));
            }
        } catch (Exception ignored) {
            // Best-effort timezone fallback
        }
        return clock.getZone();
    }

    private Double queryDailyStepGoal(byte[] userIdBytes) {
        String sql = """
                SELECT target_value
                FROM goals
                WHERE user_id = ? AND goal_type = 'DAILY_STEPS' AND enabled = TRUE
                ORDER BY updated_at DESC
                LIMIT 1
                """;
        try {
            List<Double> results = jdbcTemplate.query(
                    sql,
                    (rs, rowNum) -> rs.getDouble("target_value"),
                    userIdBytes
            );
            return results.isEmpty() ? null : results.get(0);
        } catch (Exception e) {
            log.debug("Could not query goals table for analytics: {}", e.getMessage());
            return null;
        }
    }

    private byte[] uuidToBytes(UUID uuid) {
        ByteBuffer bb = ByteBuffer.wrap(new byte[16]);
        bb.putLong(uuid.getMostSignificantBits());
        bb.putLong(uuid.getLeastSignificantBits());
        return bb.array();
    }
}
