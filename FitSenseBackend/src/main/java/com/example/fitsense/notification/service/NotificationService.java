package com.example.fitsense.notification.service;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.notification.dto.DeviceRegistrationRequest;
import com.example.fitsense.notification.dto.NotificationSettingsDto;
import com.example.fitsense.notification.entity.UserDeviceEntity;
import com.example.fitsense.notification.repository.UserDeviceRepository;
import com.example.fitsense.user.entity.UserEntity;
import com.example.fitsense.user.repository.UserRepository;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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

    private final UserDeviceRepository userDeviceRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    // In-memory user notification preferences (synced to defaults)
    private final Map<UUID, NotificationSettingsDto> userSettingsMap = new ConcurrentHashMap<>();

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

    public NotificationSettingsDto getSettings(CurrentUser authUser) {
        UserEntity user = userRepository.findByFirebaseUid(authUser.uid())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "User not found"));

        return userSettingsMap.computeIfAbsent(user.getId(), k -> NotificationSettingsDto.builder()
                .weeklyReportEnabled(true)
                .workoutRemindersEnabled(true)
                .goalAchievementsEnabled(true)
                .build());
    }

    public NotificationSettingsDto updateSettings(CurrentUser authUser, NotificationSettingsDto settings) {
        UserEntity user = userRepository.findByFirebaseUid(authUser.uid())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "User not found"));

        userSettingsMap.put(user.getId(), settings);
        log.info("Updated notification settings for user {}", user.getId());
        return settings;
    }

    public int sendPushNotification(UUID userId, String title, String body, Map<String, String> dataPayload) {
        List<UserDeviceEntity> devices = userDeviceRepository.findByUserId(userId);
        if (devices.isEmpty()) {
            log.debug("No devices registered for user {}", userId);
            return 0;
        }

        int sentCount = 0;
        for (UserDeviceEntity device : devices) {
            String token = device.getFcmToken();
            if (token == null || token.isBlank()) continue;

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
        NotificationSettingsDto settings = userSettingsMap.getOrDefault(userId,
                NotificationSettingsDto.builder().goalAchievementsEnabled(true).build());
        if (!settings.isGoalAchievementsEnabled()) return;

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
            NotificationSettingsDto settings = userSettingsMap.getOrDefault(user.getId(),
                    NotificationSettingsDto.builder().weeklyReportEnabled(true).build());
            if (!settings.isWeeklyReportEnabled()) continue;

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
}
