package com.example.fitsense.activity.service;

import com.example.fitsense.activity.dto.ActivitySyncRequest;
import com.example.fitsense.activity.dto.DailyActivityResponse;
import com.example.fitsense.activity.dto.DailyActivityUpsert;
import com.example.fitsense.activity.entity.DailyActivityEntity;
import com.example.fitsense.activity.repository.DailyActivityRepository;
import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.response.PageResponse;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.goal.entity.GoalEntity;
import com.example.fitsense.goal.repository.GoalRepository;
import com.example.fitsense.notification.service.NotificationService;
import com.example.fitsense.sync.dto.SyncEntityType;
import com.example.fitsense.sync.dto.SyncItemResult;
import com.example.fitsense.sync.dto.SyncStatus;
import com.example.fitsense.user.service.UserService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final int MAX_PAGE_SIZE = 100;

    private final DailyActivityRepository activityRepository;
    private final UserService userService;
    private final GoalRepository goalRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public DailyActivityResponse getDaily(CurrentUser authUser, LocalDate date, String timezoneId) {
        UUID userId = currentUserId(authUser);
        ZoneId zone = resolveZone(timezoneId);
        LocalDate targetDate = date != null ? date : LocalDate.now(zone);

        return activityRepository.findByUserIdAndActivityDate(userId, targetDate)
                .map(DailyActivityResponse::fromEntity)
                .orElseGet(() -> DailyActivityResponse.empty(targetDate, zone.getId()));
    }

    @Transactional(readOnly = true)
    public PageResponse<DailyActivityResponse> getHistory(
            CurrentUser authUser, LocalDate from, LocalDate to, int page, int size) {
        UUID userId = currentUserId(authUser);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(MAX_PAGE_SIZE, size)));

        Page<DailyActivityEntity> rows = activityRepository.findHistory(userId, from, to, pageable);
        return PageResponse.from(rows.map(DailyActivityResponse::fromEntity));
    }

    @Transactional
    public List<SyncItemResult> sync(CurrentUser authUser, ActivitySyncRequest request) {
        UUID userId = currentUserId(authUser);
        List<SyncItemResult> results = new ArrayList<>(request.items().size());

        for (DailyActivityUpsert item : request.items()) {
            results.add(upsert(userId, item));
        }
        return results;
    }

    /** Dùng chung cho `/api/activities/sync` và `DailyActivitySyncProcessor` (reconcile). */
    public SyncItemResult upsert(UUID userId, DailyActivityUpsert item) {
        validateTimezone(item.timezoneId());
        String clientId = item.activityDate() + "|" + item.timezoneId();
        return activityRepository.findByUserIdAndActivityDate(userId, item.activityDate())
                .map(existing -> merge(userId, clientId, existing, item))
                .orElseGet(() -> {
                    activityRepository.save(newEntity(userId, item));
                    notifyCrossedDailyGoals(userId, item.activityDate(), 0, 0.0, 0.0, item);
                    return SyncItemResult.of(
                            SyncEntityType.DAILY_ACTIVITY, clientId, SyncStatus.CREATED, "Inserted");
                });
    }

    private SyncItemResult merge(
            UUID userId, String clientId, DailyActivityEntity existing, DailyActivityUpsert item) {
        int order = item.updatedAt().compareTo(existing.getClientUpdatedAt());
        if (order < 0) {
            return SyncItemResult.conflict(
                    SyncEntityType.DAILY_ACTIVITY, clientId, DailyActivityResponse.fromEntity(existing));
        }
        if (order == 0) {
            return SyncItemResult.of(
                    SyncEntityType.DAILY_ACTIVITY, clientId, SyncStatus.DUPLICATE, "Already up to date");
        }
        int prevSteps = existing.getSteps();
        double prevDistanceM = existing.getDistanceM();
        double prevCalories = existing.getCalories();
        existing.setTimezoneId(item.timezoneId());
        existing.setSteps(item.steps());
        existing.setDistanceM(item.distanceM());
        existing.setCalories(item.calories());
        existing.setActiveMinutes(item.activeMinutes());
        existing.setClientUpdatedAt(item.updatedAt());
        activityRepository.save(existing);
        notifyCrossedDailyGoals(
                userId, item.activityDate(), prevSteps, prevDistanceM, prevCalories, item);
        return SyncItemResult.of(
                SyncEntityType.DAILY_ACTIVITY, clientId, SyncStatus.CREATED, "Updated");
    }

    private void notifyCrossedDailyGoals(
            UUID userId,
            LocalDate date,
            int prevSteps,
            double prevDistanceM,
            double prevCalories,
            DailyActivityUpsert current) {
        try {
            List<GoalEntity> goals = goalRepository.findActive(userId, date);
            for (GoalEntity goal : goals) {
                double target = goal.getTargetValue();
                boolean crossed = switch (goal.getType()) {
                    case DAILY_STEPS -> prevSteps < target && current.steps() >= target;
                    case DAILY_DISTANCE -> prevDistanceM < target && current.distanceM() >= target;
                    case DAILY_CALORIES -> prevCalories < target && current.calories() >= target;
                    default -> false;
                };
                if (crossed) {
                    notificationService.notifyGoalAchieved(userId, goal.getType().name(), target);
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to trigger goal achievement notification for user {}: {}", userId, ex.getMessage());
        }
    }

    private DailyActivityEntity newEntity(UUID userId, DailyActivityUpsert item) {
        DailyActivityEntity entity = DailyActivityEntity.builder()
                .userId(userId)
                .activityDate(item.activityDate())
                .timezoneId(item.timezoneId())
                .steps(item.steps())
                .distanceM(item.distanceM())
                .calories(item.calories())
                .activeMinutes(item.activeMinutes())
                .clientUpdatedAt(item.updatedAt())
                .build();
        entity.setId(UUID.randomUUID());
        return entity;
    }

    private void validateTimezone(String timezoneId) {
        try {
            ZoneId.of(timezoneId);
        } catch (RuntimeException ex) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR, "Unknown timezoneId: " + timezoneId);
        }
    }

    private UUID currentUserId(CurrentUser authUser) {
        return userService.getOrCreateCurrentUser(authUser).id();
    }

    private ZoneId resolveZone(String timezoneId) {
        if (timezoneId == null || timezoneId.isBlank()) {
            return ZoneId.systemDefault();
        }
        try {
            return ZoneId.of(timezoneId);
        } catch (RuntimeException ex) {
            return ZoneId.systemDefault();
        }
    }
}
