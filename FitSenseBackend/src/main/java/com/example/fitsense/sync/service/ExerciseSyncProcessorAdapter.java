package com.example.fitsense.sync.service;

import com.example.fitsense.exercise.service.ExerciseSyncProcessor;
import com.example.fitsense.exercise.service.ExerciseSyncProcessor.SyncOutcome;
import com.example.fitsense.sync.dto.SyncEntityType;
import com.example.fitsense.sync.dto.SyncItem;
import com.example.fitsense.sync.dto.SyncItemResult;
import com.example.fitsense.sync.dto.SyncStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ExerciseSyncProcessorAdapter implements SyncProcessor {

    private final ExerciseSyncProcessor delegate;

    @Override
    public SyncEntityType entityType() {
        return SyncEntityType.EXERCISE;
    }

    @Override
    public SyncItemResult process(SyncContext context, SyncItem item) {
        SyncOutcome outcome = delegate.process(context.authUser(), item.payload());
        return new SyncItemResult(
                item.entityType(),
                item.clientId(),
                statusOf(outcome.status()),
                outcome.reason(),
                outcome.serverVersion());
    }

    private SyncStatus statusOf(String status) {
        try {
            return SyncStatus.valueOf(status);
        } catch (RuntimeException ex) {
            return SyncStatus.REJECTED;
        }
    }
}
