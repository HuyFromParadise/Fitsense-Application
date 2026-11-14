package com.example.fitsense.goal.service;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.goal.dto.GoalResponse;
import com.example.fitsense.goal.dto.GoalUpsertRequest;
import com.example.fitsense.goal.entity.GoalEntity;
import com.example.fitsense.goal.repository.GoalRepository;
import com.example.fitsense.user.service.UserService;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoalService {

    private final GoalRepository goalRepository;
    private final UserService userService;
    private final Clock clock;

    @Transactional
    public GoalResponse create(CurrentUser authUser, GoalUpsertRequest request) {
        UUID userId = userService.getOrCreateCurrentUser(authUser).id();
        LocalDate today = LocalDate.now(clock);
        LocalDate startsOn = request.startsOn() != null ? request.startsOn() : today;
        validateRange(startsOn, request.endsOn());

        GoalEntity goal = GoalEntity.builder()
                .userId(userId)
                .type(request.type())
                .targetValue(request.targetValue())
                .startsOn(startsOn)
                .endsOn(request.endsOn())
                .enabled(request.enabled() == null || request.enabled())
                .build();
        goal.setId(UUID.randomUUID());

        GoalEntity saved = goalRepository.save(goal);
        log.info("Created goal id={} user={} type={}", saved.getId(), userId, saved.getType());
        return GoalResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<GoalResponse> listActive(CurrentUser authUser) {
        UUID userId = userService.getOrCreateCurrentUser(authUser).id();
        return goalRepository.findActive(userId, LocalDate.now(clock)).stream()
                .map(GoalResponse::fromEntity)
                .toList();
    }

    @Transactional
    public GoalResponse update(CurrentUser authUser, UUID goalId, GoalUpsertRequest request) {
        UUID userId = userService.getOrCreateCurrentUser(authUser).id();
        GoalEntity goal = findOwnedGoal(goalId, userId);

        LocalDate startsOn = request.startsOn() != null ? request.startsOn() : goal.getStartsOn();
        validateRange(startsOn, request.endsOn());

        goal.setType(request.type());
        goal.setTargetValue(request.targetValue());
        goal.setStartsOn(startsOn);
        goal.setEndsOn(request.endsOn());
        if (request.enabled() != null) {
            goal.setEnabled(request.enabled());
        }

        return GoalResponse.fromEntity(goalRepository.save(goal));
    }

    @Transactional
    public void delete(CurrentUser authUser, UUID goalId) {
        UUID userId = userService.getOrCreateCurrentUser(authUser).id();
        goalRepository.delete(findOwnedGoal(goalId, userId));
    }

    private GoalEntity findOwnedGoal(UUID goalId, UUID userId) {
        GoalEntity goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Goal not found"));
        if (!goal.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Goal belongs to another user");
        }
        return goal;
    }

    private void validateRange(LocalDate startsOn, LocalDate endsOn) {
        if (endsOn != null && endsOn.isBefore(startsOn)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "endsOn must not be before startsOn");
        }
    }
}
