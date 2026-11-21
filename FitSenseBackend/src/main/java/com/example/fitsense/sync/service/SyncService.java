package com.example.fitsense.sync.service;

import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.notification.entity.UserDeviceEntity;
import com.example.fitsense.notification.repository.UserDeviceRepository;
import com.example.fitsense.sync.dto.SyncEntityType;
import com.example.fitsense.sync.dto.SyncItem;
import com.example.fitsense.sync.dto.SyncItemResult;
import com.example.fitsense.sync.dto.SyncReconcileRequest;
import com.example.fitsense.sync.dto.SyncReconcileResponse;
import com.example.fitsense.sync.dto.SyncStatus;
import com.example.fitsense.user.service.UserService;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SyncService {

    private final List<SyncProcessor> processors;
    private final UserService userService;
    private final UserDeviceRepository deviceRepository;
    private final Clock clock;

    public SyncReconcileResponse reconcile(CurrentUser authUser, SyncReconcileRequest request) {
        UUID userId = userService.getOrCreateCurrentUser(authUser).id();
        SyncContext context = new SyncContext(userId, authUser);
        Map<SyncEntityType, SyncProcessor> registry = processors.stream()
                .collect(Collectors.toMap(
                        SyncProcessor::entityType,
                        processor -> processor,
                        (first, second) -> first,
                        LinkedHashMap::new));

        List<SyncItemResult> results = request.items().stream()
                .map(item -> processItem(registry, context, item))
                .toList();

        Instant now = Instant.now(clock);
        updateDeviceSyncTime(userId, request.deviceId(), now);
        return new SyncReconcileResponse(results, now);
    }

    private SyncItemResult processItem(
            Map<SyncEntityType, SyncProcessor> registry, SyncContext context, SyncItem item) {
        SyncProcessor processor = registry.get(item.entityType());
        if (processor == null) {
            return SyncItemResult.of(
                    item.entityType(), item.clientId(), SyncStatus.REJECTED, "Unsupported entityType");
        }
        try {
            return processor.process(context, item);
        } catch (Exception ex) {
            log.warn("Sync item {} failed: {}", item.clientId(), ex.getMessage());
            return SyncItemResult.of(
                    item.entityType(), item.clientId(), SyncStatus.REJECTED, ex.getMessage());
        }
    }

    private void updateDeviceSyncTime(UUID userId, String deviceId, Instant now) {
        try {
            UserDeviceEntity device = deviceRepository
                    .findByUserIdAndDeviceId(userId, deviceId)
                    .orElseGet(() -> {
                        UserDeviceEntity created = UserDeviceEntity.builder()
                                .userId(userId)
                                .deviceId(deviceId)
                                .platform("android")
                                .fcmToken(null)
                                .build();
                        created.setId(UUID.randomUUID());
                        return created;
                    });
            device.setLastSyncAt(now);
            deviceRepository.save(device);
        } catch (Exception ex) {
            log.warn("Failed to update last_sync_at for device {}: {}", deviceId, ex.getMessage());
        }
    }
}
