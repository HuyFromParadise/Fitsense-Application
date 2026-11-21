package com.example.fitsense.sync.service;

import com.example.fitsense.activity.dto.DailyActivityUpsert;
import com.example.fitsense.activity.service.ActivityService;
import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.sync.dto.SyncEntityType;
import com.example.fitsense.sync.dto.SyncItem;
import com.example.fitsense.sync.dto.SyncItemResult;
import com.example.fitsense.sync.dto.SyncStatus;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
public class DailyActivitySyncProcessor implements SyncProcessor {

    private final ActivityService activityService;
    private final JsonMapper jsonMapper;
    private final Validator validator;

    @Override
    public SyncEntityType entityType() {
        return SyncEntityType.DAILY_ACTIVITY;
    }

    @Override
    public SyncItemResult process(SyncContext context, SyncItem item) {
        try {
            DailyActivityUpsert upsert =
                    jsonMapper.convertValue(item.payload(), DailyActivityUpsert.class);
            Set<ConstraintViolation<DailyActivityUpsert>> violations = validator.validate(upsert);
            if (!violations.isEmpty()) {
                ConstraintViolation<DailyActivityUpsert> violation = violations.iterator().next();
                return SyncItemResult.of(
                        SyncEntityType.DAILY_ACTIVITY,
                        item.clientId(),
                        SyncStatus.REJECTED,
                        violation.getPropertyPath() + ": " + violation.getMessage());
            }
            return activityService.upsert(context.userId(), upsert);
        } catch (ApiException ex) {
            return SyncItemResult.of(
                    SyncEntityType.DAILY_ACTIVITY,
                    item.clientId(),
                    SyncStatus.REJECTED,
                    ex.getMessage());
        } catch (RuntimeException ex) {
            return SyncItemResult.of(
                    SyncEntityType.DAILY_ACTIVITY,
                    item.clientId(),
                    SyncStatus.REJECTED,
                    "Invalid daily activity payload: " + ex.getMessage());
        }
    }
}
