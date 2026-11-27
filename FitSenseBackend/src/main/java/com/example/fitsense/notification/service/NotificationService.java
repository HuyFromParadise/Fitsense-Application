package com.example.fitsense.notification.service;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.notification.dto.DeviceRegistrationRequest;
import com.example.fitsense.notification.dto.NotificationSettingsDto;
import com.example.fitsense.notification.entity.NotificationSettingsEntity;
import com.example.fitsense.notification.entity.UserDeviceEntity;
import com.example.fitsense.notification.repository.NotificationSettingsRepository;
import com.example.fitsense.notification.repository.UserDeviceRepository;
import com.example.fitsense.user.entity.UserEntity;
import com.example.fitsense.user.repository.UserRepository;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.cloud.FirestoreClient;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final String DEFAULT_QUIET_START = "22:00";
    private static final String DEFAULT_QUIET_END = "07:00";

    private final UserDeviceRepository userDeviceRepository;
    private final UserRepository userRepository;
    private final NotificationSettingsRepository settingsRepository;
    private final JdbcTemplate jdbcTemplate;
    private final Set<String> sentGoalNotifications = ConcurrentHashMap.newKeySet();

    @Transactional
    public void registerDevice(CurrentUser authUser, DeviceRegistrationRequest request) {
        UserEntity user = userRepository.findByFirebaseUid(authUser.uid())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "User not found"));

        UserDeviceEntity device = userDeviceRepository
                .findByUserIdAndDeviceId(user.getId(), request.getDeviceId())
                .orElseGet(() -> {
                    UserDeviceEntity d = UserDeviceEntity.builder()
                            .userId(user.getId())
                            .deviceId(request.getDeviceId())
                            .build();
                    d.setId(UUID.randomUUID());
                    return d;
                });

        device.setPlatform(request.getPlatform().toUpperCase());
        device.setFcmToken(request.getFcmToken());
        device.setLastSyncAt(Instant.now());
        userDeviceRepository.save(device);
        log.info("Registered device {} for user {}", request.getDeviceId(), user.getId());
    }

    @Transactional(readOnly = true)
    public NotificationSettingsDto getSettings(CurrentUser authUser) {
        UserEntity user = userRepository.findByFirebaseUid(authUser.uid())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "User not found"));

        return settingsRepository.findById(user.getId())
                .map(this::toDto)
                .orElseGet(this::defaultDto);
    }

    @Transactional
    public NotificationSettingsDto updateSettings(CurrentUser authUser, NotificationSettingsDto settings) {
        UserEntity user = userRepository.findByFirebaseUid(authUser.uid())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "User not found"));

        NotificationSettingsEntity entity = settingsRepository.findById(user.getId())
                .orElseGet(() -> NotificationSettingsEntity.builder()
                        .userId(user.getId())
                        .quietHoursStart(DEFAULT_QUIET_START)
                        .quietHoursEnd(DEFAULT_QUIET_END)
                        .build());

        entity.setWeeklyReportEnabled(settings.isWeeklyReportEnabled());
        entity.setWorkoutRemindersEnabled(settings.isWorkoutRemindersEnabled());
        entity.setGoalAchievementsEnabled(settings.isGoalAchievementsEnabled());
        if (settings.getQuietHoursStart() != null && !settings.getQuietHoursStart().isBlank()) {
            entity.setQuietHoursStart(settings.getQuietHoursStart());
        } else if (entity.getQuietHoursStart() == null) {
            entity.setQuietHoursStart(DEFAULT_QUIET_START);
        }
        if (settings.getQuietHoursEnd() != null && !settings.getQuietHoursEnd().isBlank()) {
            entity.setQuietHoursEnd(settings.getQuietHoursEnd());
        } else if (entity.getQuietHoursEnd() == null) {
            entity.setQuietHoursEnd(DEFAULT_QUIET_END);
        }

        NotificationSettingsEntity saved = settingsRepository.save(entity);
        syncSettingsToFirestore(authUser.uid(), saved);
        log.info("Updated notification settings for user {}", user.getId());
        return toDto(saved);
    }

    public int sendPushNotification(UUID userId, String title, String body, Map<String, String> dataPayload) {
        List<UserDeviceEntity> devices = userDeviceRepository.findByUserId(userId);
        if (devices.isEmpty()) {
            log.debug("No devices registered for user {}", userId);
            return 0;
        }

        int sentCount = 0;
        Set<String> seenTokens = new HashSet<>();
        for (UserDeviceEntity device : devices) {
            String token = device.getFcmToken();
            if (token == null || token.isBlank() || !seenTokens.add(token)) continue;

            if (FirebaseApp.getApps().isEmpty()) {
                log.info("[MOCK PUSH] To user={}, device={}, title='{}', body='{}'",
                        userId, device.getDeviceId(), title, body);
                sentCount++;
                continue;
            }

            try {
                Message.Builder msgBuilder = Message.builder()
                        .setToken(token)
                        .setNotification(Notification.builder()
                                .setTitle(title)
                                .setBody(body)
                                .build());

                if (dataPayload != null) {
                    msgBuilder.putAllData(dataPayload);
                }

                String response = FirebaseMessaging.getInstance().send(msgBuilder.build());
                log.info("Sent FCM message to user {} (messageId={})", userId, response);
                sentCount++;
            } catch (Exception e) {
                log.warn("Failed to send FCM to user {} (device {}): {}", userId, device.getDeviceId(), e.getMessage());
            }
        }
        return sentCount;
    }

    public void notifyGoalAchieved(UUID userId, String goalType, double targetValue) {
        boolean enabled = settingsRepository.findById(userId)
                .map(NotificationSettingsEntity::isGoalAchievementsEnabled)
                .orElse(true);
        if (!enabled) return;

        LocalDate today = LocalDate.now();
        LocalDate periodKey = goalType != null && goalType.startsWith("WEEKLY_")
                ? today.with(DayOfWeek.MONDAY)
                : today;
        String dedupeKey = userId + ":" + goalType + ":" + periodKey;
        if (!sentGoalNotifications.add(dedupeKey)) {
            log.debug("Skipping duplicate goal achievement notification: {}", dedupeKey);
            return;
        }

        String title = "🎉 Mục tiêu hoàn thành!";
        String body = String.format("Chúc mừng bạn đã hoàn thành mục tiêu %s với chỉ số %.0f!", goalType, targetValue);
        sendPushNotification(userId, title, body, Map.of("type", "GOAL_ACHIEVED", "goalType", goalType));
    }

    /**
     * Automated weekly activity report scheduled every Sunday at 08:00 AM.
     */
    @Scheduled(cron = "0 0 8 * * SUN")
    public int dispatchWeeklyReports() {
        log.info("Starting automated weekly report dispatch...");
        LocalDate now = LocalDate.now();
        LocalDate weekAgo = now.minusDays(7);

        List<UserEntity> users = userRepository.findAll();
        int sentReports = 0;

        for (UserEntity user : users) {
            boolean weeklyEnabled = settingsRepository.findById(user.getId())
                    .map(NotificationSettingsEntity::isWeeklyReportEnabled)
                    .orElse(true);
            if (!weeklyEnabled) continue;

            try {
                // Sum steps & distance from daily_activities for past 7 days
                String sql = """
                    SELECT COALESCE(SUM(steps), 0) AS total_steps,
                           COALESCE(SUM(distance_m), 0) AS total_dist
                    FROM daily_activities
                    WHERE user_id = ? AND activity_date BETWEEN ? AND ?
                """;
                Map<String, Object> row = jdbcTemplate.queryForMap(sql, user.getId(), weekAgo, now);
                long totalSteps = ((Number) row.getOrDefault("total_steps", 0L)).longValue();
                double totalDistM = ((Number) row.getOrDefault("total_dist", 0.0)).doubleValue();
                double totalKm = Math.round((totalDistM / 1000.0) * 10.0) / 10.0;

                String title = "📊 Báo cáo tuần FitSense";
                String body = String.format("Tuần qua bạn đã hoàn thành %,d bước chân và %.1f km. Xem ngay báo cáo chi tiết!",
                        totalSteps, totalKm);

                int sent = sendPushNotification(user.getId(), title, body, Map.of(
                        "type", "WEEKLY_REPORT",
                        "periodStart", weekAgo.toString(),
                        "periodEnd", now.toString()
                ));
                if (sent > 0) sentReports++;
            } catch (Exception e) {
                log.warn("Error dispatching weekly report for user {}: {}", user.getId(), e.getMessage());
            }
        }

        log.info("Finished automated weekly report dispatch. Sent {} reports.", sentReports);
        return sentReports;
    }

    private NotificationSettingsDto toDto(NotificationSettingsEntity entity) {
        return NotificationSettingsDto.builder()
                .weeklyReportEnabled(entity.isWeeklyReportEnabled())
                .workoutRemindersEnabled(entity.isWorkoutRemindersEnabled())
                .goalAchievementsEnabled(entity.isGoalAchievementsEnabled())
                .quietHoursStart(entity.getQuietHoursStart())
                .quietHoursEnd(entity.getQuietHoursEnd())
                .build();
    }

    private NotificationSettingsDto defaultDto() {
        return NotificationSettingsDto.builder()
                .weeklyReportEnabled(true)
                .workoutRemindersEnabled(true)
                .goalAchievementsEnabled(true)
                .quietHoursStart(DEFAULT_QUIET_START)
                .quietHoursEnd(DEFAULT_QUIET_END)
                .build();
    }

    private void syncSettingsToFirestore(String firebaseUid, NotificationSettingsEntity entity) {
        if (FirebaseApp.getApps().isEmpty()) {
            return;
        }
        try {
            Firestore firestore = FirestoreClient.getFirestore();
            Map<String, Object> payload = new HashMap<>();
            payload.put("weeklyReportEnabled", entity.isWeeklyReportEnabled());
            payload.put("workoutRemindersEnabled", entity.isWorkoutRemindersEnabled());
            payload.put("goalAchievementsEnabled", entity.isGoalAchievementsEnabled());
            payload.put("quietHoursStart", entity.getQuietHoursStart());
            payload.put("quietHoursEnd", entity.getQuietHoursEnd());

            firestore.collection("users")
                    .document(firebaseUid)
                    .collection("preferences")
                    .document("settings")
                    .set(payload);
        } catch (Exception e) {
            log.warn("Could not mirror notification settings to Firestore for {}: {}", firebaseUid, e.getMessage());
        }
    }
}
