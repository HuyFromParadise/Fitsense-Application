package com.example.fitsense.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.exercise.service.ExerciseSyncProcessor;
import com.example.fitsense.exercise.service.ExerciseSyncProcessor.SyncOutcome;
import com.example.fitsense.sync.dto.SyncEntityType;
import com.example.fitsense.sync.dto.SyncItem;
import com.example.fitsense.sync.dto.SyncItemResult;
import com.example.fitsense.sync.dto.SyncStatus;
import com.example.fitsense.sync.service.ExerciseSyncProcessorAdapter;
import com.example.fitsense.sync.service.SyncContext;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExerciseSyncProcessorAdapterTest {

    @Mock
    private ExerciseSyncProcessor delegate;

    private ExerciseSyncProcessorAdapter adapter;

    private final CurrentUser user = new CurrentUser("uid-1", "a@fitsense.app");
    private final SyncContext context = new SyncContext(UUID.randomUUID(), user);
    private final SyncItem item =
            new SyncItem(SyncEntityType.EXERCISE, "client-1", Map.of("id", "x"));

    @BeforeEach
    void setUp() {
        adapter = new ExerciseSyncProcessorAdapter(delegate);
    }

    @Test
    void passesCreatedThrough() {
        when(delegate.process(user, item.payload()))
                .thenReturn(new SyncOutcome("CREATED", null, Map.of("id", "x")));

        SyncItemResult result = adapter.process(context, item);

        assertThat(result.entityType()).isEqualTo(SyncEntityType.EXERCISE);
        assertThat(result.clientId()).isEqualTo("client-1");
        assertThat(result.status()).isEqualTo(SyncStatus.CREATED);
        assertThat(result.serverVersion()).isEqualTo(Map.of("id", "x"));
    }

    @Test
    void passesDuplicateThrough() {
        when(delegate.process(user, item.payload()))
                .thenReturn(new SyncOutcome("DUPLICATE", null, null));

        SyncItemResult result = adapter.process(context, item);

        assertThat(result.status()).isEqualTo(SyncStatus.DUPLICATE);
    }

    @Test
    void passesConflictThrough() {
        when(delegate.process(user, item.payload()))
                .thenReturn(new SyncOutcome("CONFLICT", "Client copy is older", null));

        SyncItemResult result = adapter.process(context, item);

        assertThat(result.status()).isEqualTo(SyncStatus.CONFLICT);
        assertThat(result.reason()).isEqualTo("Client copy is older");
    }

    @Test
    void mapsUnknownStatusToRejected() {
        when(delegate.process(user, item.payload()))
                .thenReturn(new SyncOutcome("WHATEVER", "nope", null));

        SyncItemResult result = adapter.process(context, item);

        assertThat(result.status()).isEqualTo(SyncStatus.REJECTED);
    }

    @Test
    void callsDelegateWithAuthUserAndPayload() {
        when(delegate.process(user, item.payload()))
                .thenReturn(new SyncOutcome("CREATED", null, null));

        adapter.process(context, item);

        verify(delegate).process(user, item.payload());
    }
}
