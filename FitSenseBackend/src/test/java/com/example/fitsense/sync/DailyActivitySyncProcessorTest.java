package com.example.fitsense.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.fitsense.activity.dto.DailyActivityUpsert;
import com.example.fitsense.activity.service.ActivityService;
import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.sync.dto.SyncEntityType;
import com.example.fitsense.sync.dto.SyncItem;
import com.example.fitsense.sync.dto.SyncItemResult;
import com.example.fitsense.sync.dto.SyncStatus;
import com.example.fitsense.sync.service.DailyActivitySyncProcessor;
import com.example.fitsense.sync.service.SyncContext;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class DailyActivitySyncProcessorTest {

    @Mock
    private ActivityService activityService;

    private DailyActivitySyncProcessor processor;
    private SyncContext context;

    private final String clientId = "2026-11-19|Asia/Saigon";

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        processor = new DailyActivitySyncProcessor(activityService, new JsonMapper(), validator);
        context = new SyncContext(UUID.randomUUID(), new CurrentUser("uid-1", "a@fitsense.app"));
    }

    @Test
    void returnsCreatedFromActivityService() {
        SyncItem item = item(validPayload());
        SyncItemResult expected = SyncItemResult.of(
                SyncEntityType.DAILY_ACTIVITY, clientId, SyncStatus.CREATED, "Inserted");
        when(activityService.upsert(any(UUID.class), any(DailyActivityUpsert.class))).thenReturn(expected);

        SyncItemResult result = processor.process(context, item);

        assertThat(result.entityType()).isEqualTo(SyncEntityType.DAILY_ACTIVITY);
        assertThat(result.clientId()).isEqualTo(clientId);
        assertThat(result.status()).isEqualTo(SyncStatus.CREATED);
    }

    @Test
    void returnsDuplicateFromActivityService() {
        SyncItem item = item(validPayload());
        SyncItemResult expected = SyncItemResult.of(
                SyncEntityType.DAILY_ACTIVITY, clientId, SyncStatus.DUPLICATE, "Already up to date");
        when(activityService.upsert(any(UUID.class), any(DailyActivityUpsert.class))).thenReturn(expected);

        SyncItemResult result = processor.process(context, item);

        assertThat(result.status()).isEqualTo(SyncStatus.DUPLICATE);
    }

    @Test
    void rejectsNegativeSteps() {
        Map<String, Object> payload = validPayload();
        payload.put("steps", -1);

        SyncItemResult result = processor.process(context, item(payload));

        assertThat(result.status()).isEqualTo(SyncStatus.REJECTED);
        assertThat(result.reason()).contains("steps");
        verify(activityService, never()).upsert(any(), any());
    }

    @Test
    void rejectsUnknownTimezone() {
        SyncItem item = item(validPayload());
        when(activityService.upsert(any(UUID.class), any(DailyActivityUpsert.class)))
                .thenThrow(new ApiException(
                        ErrorCode.VALIDATION_ERROR, "Unknown timezoneId: Mars/Olympus"));

        SyncItemResult result = processor.process(context, item);

        assertThat(result.status()).isEqualTo(SyncStatus.REJECTED);
        assertThat(result.reason()).contains("Unknown timezoneId");
    }

    @Test
    void rejectsUnparseablePayload() {
        SyncItemResult result = processor.process(context, item(Map.of("steps", "abc")));

        assertThat(result.status()).isEqualTo(SyncStatus.REJECTED);
        assertThat(result.reason()).contains("Invalid daily activity payload");
    }

    private SyncItem item(Map<String, Object> payload) {
        return new SyncItem(SyncEntityType.DAILY_ACTIVITY, clientId, payload);
    }

    private Map<String, Object> validPayload() {
        return new java.util.HashMap<>(Map.of(
                "activityDate", "2026-11-19",
                "timezoneId", "Asia/Saigon",
                "steps", 100,
                "distanceM", 80.0,
                "calories", 4.0,
                "activeMinutes", 1,
                "updatedAt", "2026-11-19T06:00:00Z"));
    }
}
