package com.example.fitsense.exercise.service;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.exercise.dto.ExerciseCreateRequest;
import com.example.fitsense.exercise.service.ExerciseService.CreateSessionResult;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Sync processor for entityType = "EXERCISE".
 * Designed to be invoked by Developer B's SyncController during /api/sync/reconcile.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExerciseSyncProcessor {

    private final ExerciseService exerciseService;
    private final JsonMapper jsonMapper;

    public record SyncOutcome(String status, String reason, Object serverVersion) {}

    public SyncOutcome process(CurrentUser authUser, Map<String, Object> payload) {
        try {
            ExerciseCreateRequest request = jsonMapper.convertValue(payload, ExerciseCreateRequest.class);
            CreateSessionResult result = exerciseService.createSession(authUser, request);
            String status = result.created() ? "CREATED" : "DUPLICATE";
            return new SyncOutcome(status, null, result.summary());
        } catch (ApiException ex) {
            if (ex.getCode() == ErrorCode.FORBIDDEN) {
                return new SyncOutcome("CONFLICT", ex.getMessage(), null);
            }
            return new SyncOutcome("REJECTED", ex.getMessage(), null);
        } catch (Exception ex) {
            log.warn("Rejected invalid exercise sync payload: {}", ex.getMessage());
            return new SyncOutcome("REJECTED", "Invalid exercise payload: " + ex.getMessage(), null);
        }
    }
}
