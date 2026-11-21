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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final int MAX_PAGE_SIZE = 100;

    private final DailyActivityRepository activityRepository;
    private final UserService userService;

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
                .map(existing -> merge(clientId, existing, item))
                .orElseGet(() -> {
                    activityRepository.save(newEntity(userId, item));
                    return SyncItemResult.of(
                            SyncEntityType.DAILY_ACTIVITY, clientId, SyncStatus.CREATED, "Inserted");
                });
    }

    private SyncItemResult merge(String clientId, DailyActivityEntity existing, DailyActivityUpsert item) {
        int order = item.updatedAt().compareTo(existing.getClientUpdatedAt());
        if (order < 0) {
            return SyncItemResult.conflict(
                    SyncEntityType.DAILY_ACTIVITY, clientId, DailyActivityResponse.fromEntity(existing));
        }
        if (order == 0) {
            return SyncItemResult.of(
                    SyncEntityType.DAILY_ACTIVITY, clientId, SyncStatus.DUPLICATE, "Already up to date");
        }
        existing.setTimezoneId(item.timezoneId());
        existing.setSteps(item.steps());
        existing.setDistanceM(item.distanceM());
        existing.setCalories(item.calories());
        existing.setActiveMinutes(item.activeMinutes());
        existing.setClientUpdatedAt(item.updatedAt());
        activityRepository.save(existing);
        return SyncItemResult.of(
                SyncEntityType.DAILY_ACTIVITY, clientId, SyncStatus.CREATED, "Updated");
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
