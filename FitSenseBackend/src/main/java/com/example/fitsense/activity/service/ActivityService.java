package com.example.fitsense.activity.service;

import com.example.fitsense.activity.dto.DailyActivityResponse;
import com.example.fitsense.activity.entity.DailyActivityEntity;
import com.example.fitsense.activity.repository.DailyActivityRepository;
import com.example.fitsense.common.response.PageResponse;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.user.service.UserService;
import java.time.LocalDate;
import java.time.ZoneId;
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
