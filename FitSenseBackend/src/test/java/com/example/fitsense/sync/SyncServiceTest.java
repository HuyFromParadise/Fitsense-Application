package com.example.fitsense.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.notification.entity.UserDeviceEntity;
import com.example.fitsense.notification.repository.UserDeviceRepository;
import com.example.fitsense.sync.dto.SyncEntityType;
import com.example.fitsense.sync.dto.SyncItem;
import com.example.fitsense.sync.dto.SyncItemResult;
import com.example.fitsense.sync.dto.SyncReconcileRequest;
import com.example.fitsense.sync.dto.SyncReconcileResponse;
import com.example.fitsense.sync.dto.SyncStatus;
import com.example.fitsense.sync.service.SyncProcessor;
import com.example.fitsense.sync.service.SyncService;
import com.example.fitsense.user.dto.UserResponse;
import com.example.fitsense.user.service.UserService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SyncServiceTest {

    @Mock
    private SyncProcessor daily;
    @Mock
    private SyncProcessor exercise;
    @Mock
    private UserService userService;
    @Mock
    private UserDeviceRepository deviceRepository;

    private final CurrentUser authUser = new CurrentUser("uid-1", "a@fitsense.app");
    private final UUID userId = UUID.randomUUID();
    private final Instant fixedInstant = Instant.parse("2026-11-19T07:00:00Z");
    private final Clock clock = Clock.fixed(fixedInstant, ZoneOffset.UTC);

    private final SyncItem dailyItem = new SyncItem(
            SyncEntityType.DAILY_ACTIVITY, "2026-11-19|Asia/Saigon", Map.of("steps", 10));
    private final SyncItem exerciseItem =
            new SyncItem(SyncEntityType.EXERCISE, "client-1", Map.of("id", "x"));

    private SyncService syncService;

    @BeforeEach
    void setUp() {
        when(userService.getOrCreateCurrentUser(authUser))
                .thenReturn(UserResponse.builder().id(userId).build());
    }

    @Test
    void dispatchesItemsToTheirProcessorsAndKeepsOrder() {
        when(daily.entityType()).thenReturn(SyncEntityType.DAILY_ACTIVITY);
        when(exercise.entityType()).thenReturn(SyncEntityType.EXERCISE);
        when(daily.process(any(), eq(dailyItem))).thenReturn(SyncItemResult.of(
                SyncEntityType.DAILY_ACTIVITY, dailyItem.clientId(), SyncStatus.CREATED, "ok"));
        when(exercise.process(any(), eq(exerciseItem))).thenReturn(SyncItemResult.of(
                SyncEntityType.EXERCISE, exerciseItem.clientId(), SyncStatus.DUPLICATE, "ok"));
        syncService = new SyncService(List.of(daily, exercise), userService, deviceRepository, clock);

        SyncReconcileResponse response = syncService.reconcile(
                authUser, new SyncReconcileRequest("device-1", List.of(dailyItem, exerciseItem)));

        assertThat(response.results()).extracting(SyncItemResult::status)
                .containsExactly(SyncStatus.CREATED, SyncStatus.DUPLICATE);
        assertThat(response.serverTime()).isEqualTo(fixedInstant);
    }

    @Test
    void rejectsItemWithoutRegisteredProcessor() {
        when(daily.entityType()).thenReturn(SyncEntityType.DAILY_ACTIVITY);
        syncService = new SyncService(List.of(daily), userService, deviceRepository, clock);

        SyncReconcileResponse response = syncService.reconcile(
                authUser, new SyncReconcileRequest("device-1", List.of(exerciseItem)));

        assertThat(response.results().get(0).status()).isEqualTo(SyncStatus.REJECTED);
        assertThat(response.results().get(0).reason()).contains("Unsupported entityType");
        verify(daily, never()).process(any(), any());
    }

    @Test
    void isolatesProcessorFailure() {
        SyncItem second = new SyncItem(
                SyncEntityType.DAILY_ACTIVITY, "2026-11-20|Asia/Saigon", Map.of("steps", 20));
        when(daily.entityType()).thenReturn(SyncEntityType.DAILY_ACTIVITY);
        when(daily.process(any(), eq(dailyItem)))
                .thenThrow(new IllegalStateException("boom"));
        when(daily.process(any(), eq(second))).thenReturn(SyncItemResult.of(
                SyncEntityType.DAILY_ACTIVITY, second.clientId(), SyncStatus.CREATED, "ok"));
        syncService = new SyncService(List.of(daily), userService, deviceRepository, clock);

        SyncReconcileResponse response = syncService.reconcile(
                authUser, new SyncReconcileRequest("device-1", List.of(dailyItem, second)));

        assertThat(response.results().get(0).status()).isEqualTo(SyncStatus.REJECTED);
        assertThat(response.results().get(0).reason()).isEqualTo("boom");
        assertThat(response.results().get(1).status()).isEqualTo(SyncStatus.CREATED);
    }

    @Test
    void updatesExistingDeviceLastSyncAt() {
        when(daily.entityType()).thenReturn(SyncEntityType.DAILY_ACTIVITY);
        when(daily.process(any(), eq(dailyItem))).thenReturn(SyncItemResult.of(
                SyncEntityType.DAILY_ACTIVITY, dailyItem.clientId(), SyncStatus.CREATED, "ok"));
        UserDeviceEntity device = UserDeviceEntity.builder()
                .userId(userId)
                .deviceId("device-1")
                .platform("android")
                .build();
        when(deviceRepository.findByUserIdAndDeviceId(userId, "device-1"))
                .thenReturn(Optional.of(device));
        syncService = new SyncService(List.of(daily), userService, deviceRepository, clock);

        syncService.reconcile(
                authUser, new SyncReconcileRequest("device-1", List.of(dailyItem)));

        assertThat(device.getLastSyncAt()).isEqualTo(fixedInstant);
        verify(deviceRepository).save(device);
    }

    @Test
    void createsDeviceRowWhenMissing() {
        when(daily.entityType()).thenReturn(SyncEntityType.DAILY_ACTIVITY);
        when(daily.process(any(), eq(dailyItem))).thenReturn(SyncItemResult.of(
                SyncEntityType.DAILY_ACTIVITY, dailyItem.clientId(), SyncStatus.CREATED, "ok"));
        when(deviceRepository.findByUserIdAndDeviceId(userId, "device-1"))
                .thenReturn(Optional.empty());
        syncService = new SyncService(List.of(daily), userService, deviceRepository, clock);

        syncService.reconcile(
                authUser, new SyncReconcileRequest("device-1", List.of(dailyItem)));

        ArgumentCaptor<UserDeviceEntity> saved = ArgumentCaptor.forClass(UserDeviceEntity.class);
        verify(deviceRepository).save(saved.capture());
        assertThat(saved.getValue().getId()).isNotNull();
        assertThat(saved.getValue().getPlatform()).isEqualTo("android");
        assertThat(saved.getValue().getFcmToken()).isNull();
        assertThat(saved.getValue().getLastSyncAt()).isEqualTo(fixedInstant);
    }

    @Test
    void deviceBookkeepingFailureDoesNotFailBatch() {
        when(daily.entityType()).thenReturn(SyncEntityType.DAILY_ACTIVITY);
        when(daily.process(any(), eq(dailyItem))).thenReturn(SyncItemResult.of(
                SyncEntityType.DAILY_ACTIVITY, dailyItem.clientId(), SyncStatus.CREATED, "ok"));
        when(deviceRepository.findByUserIdAndDeviceId(any(), anyString()))
                .thenThrow(new RuntimeException("db down"));
        syncService = new SyncService(List.of(daily), userService, deviceRepository, clock);

        SyncReconcileResponse response = syncService.reconcile(
                authUser, new SyncReconcileRequest("device-1", List.of(dailyItem)));

        assertThat(response.results()).hasSize(1);
        assertThat(response.results().get(0).status()).isEqualTo(SyncStatus.CREATED);
    }

    @Test
    void resolvesUserBeforeProcessing() {
        when(daily.entityType()).thenReturn(SyncEntityType.DAILY_ACTIVITY);
        when(daily.process(any(), eq(dailyItem))).thenReturn(SyncItemResult.of(
                SyncEntityType.DAILY_ACTIVITY, dailyItem.clientId(), SyncStatus.CREATED, "ok"));
        syncService = new SyncService(List.of(daily), userService, deviceRepository, clock);

        syncService.reconcile(
                authUser, new SyncReconcileRequest("device-1", List.of(dailyItem)));

        verify(userService).getOrCreateCurrentUser(authUser);
    }
}
