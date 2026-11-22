package com.example.fitsense.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.notification.dto.DeviceRegistrationRequest;
import com.example.fitsense.notification.dto.NotificationSettingsDto;
import com.example.fitsense.notification.entity.NotificationSettingsEntity;
import com.example.fitsense.notification.entity.UserDeviceEntity;
import com.example.fitsense.notification.repository.NotificationSettingsRepository;
import com.example.fitsense.notification.repository.UserDeviceRepository;
import com.example.fitsense.notification.service.NotificationService;
import com.example.fitsense.user.entity.UserEntity;
import com.example.fitsense.user.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private UserDeviceRepository userDeviceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationSettingsRepository settingsRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private NotificationService notificationService;

    private UserEntity testUser;
    private CurrentUser authUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        authUser = new CurrentUser("firebase-uid-1", "user@fitsense.app");
        testUser = UserEntity.builder()
                .firebaseUid("firebase-uid-1")
                .email("user@fitsense.app")
                .displayName("Test User")
                .build();
        testUser.setId(userId);
    }

    @Test
    void registerDevice_createsNewDeviceIfNotFound() {
        when(userRepository.findByFirebaseUid("firebase-uid-1")).thenReturn(Optional.of(testUser));
        when(userDeviceRepository.findByUserIdAndDeviceId(userId, "dev-uuid-1")).thenReturn(Optional.empty());
        when(userDeviceRepository.save(any(UserDeviceEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        DeviceRegistrationRequest req = new DeviceRegistrationRequest("dev-uuid-1", "android", "fcm-token-123");
        notificationService.registerDevice(authUser, req);

        verify(userDeviceRepository).save(any(UserDeviceEntity.class));
    }

    @Test
    void registerDevice_updatesExistingDevice() {
        UserDeviceEntity existing = UserDeviceEntity.builder()
                .userId(userId)
                .deviceId("dev-uuid-1")
                .platform("ANDROID")
                .fcmToken("old-token")
                .build();
        existing.setId(UUID.randomUUID());

        when(userRepository.findByFirebaseUid("firebase-uid-1")).thenReturn(Optional.of(testUser));
        when(userDeviceRepository.findByUserIdAndDeviceId(userId, "dev-uuid-1")).thenReturn(Optional.of(existing));
        when(userDeviceRepository.save(any(UserDeviceEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        DeviceRegistrationRequest req = new DeviceRegistrationRequest("dev-uuid-1", "android", "new-token-456");
        notificationService.registerDevice(authUser, req);

        assertThat(existing.getFcmToken()).isEqualTo("new-token-456");
        verify(userDeviceRepository).save(existing);
    }

    @Test
    void getSettings_returnsDefaultSettings() {
        when(userRepository.findByFirebaseUid("firebase-uid-1")).thenReturn(Optional.of(testUser));
        when(settingsRepository.findById(userId)).thenReturn(Optional.empty());

        NotificationSettingsDto settings = notificationService.getSettings(authUser);

        assertThat(settings.isWeeklyReportEnabled()).isTrue();
        assertThat(settings.isWorkoutRemindersEnabled()).isTrue();
        assertThat(settings.isGoalAchievementsEnabled()).isTrue();
        assertThat(settings.getQuietHoursStart()).isEqualTo("22:00");
        assertThat(settings.getQuietHoursEnd()).isEqualTo("07:00");
    }

    @Test
    void updateSettings_persistsAndReturnsNewSettings() {
        when(userRepository.findByFirebaseUid("firebase-uid-1")).thenReturn(Optional.of(testUser));
        when(settingsRepository.findById(userId)).thenReturn(Optional.empty());
        when(settingsRepository.save(any(NotificationSettingsEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        NotificationSettingsDto update = NotificationSettingsDto.builder()
                .weeklyReportEnabled(false)
                .workoutRemindersEnabled(true)
                .goalAchievementsEnabled(false)
                .build();

        NotificationSettingsDto result = notificationService.updateSettings(authUser, update);

        assertThat(result.isWeeklyReportEnabled()).isFalse();
        assertThat(result.isGoalAchievementsEnabled()).isFalse();
        verify(settingsRepository).save(any(NotificationSettingsEntity.class));
    }

    @Test
    void sendPushNotification_returnsZeroWhenNoDevices() {
        when(userDeviceRepository.findByUserId(userId)).thenReturn(List.of());

        int sent = notificationService.sendPushNotification(userId, "Hello", "World", null);

        assertThat(sent).isEqualTo(0);
    }

    @Test
    void sendPushNotification_sendsMockWhenFirebaseNotConfigured() {
        UserDeviceEntity device = UserDeviceEntity.builder()
                .userId(userId)
                .deviceId("dev-1")
                .fcmToken("mock-fcm-token")
                .platform("ANDROID")
                .build();
        when(userDeviceRepository.findByUserId(userId)).thenReturn(List.of(device));

        int sent = notificationService.sendPushNotification(userId, "Title", "Body", Map.of("key", "val"));

        assertThat(sent).isEqualTo(1);
    }

    @Test
    void notifyGoalAchieved_sendsNotificationWhenEnabled() {
        when(settingsRepository.findById(userId)).thenReturn(Optional.empty());
        UserDeviceEntity device = UserDeviceEntity.builder()
                .userId(userId)
                .deviceId("dev-1")
                .fcmToken("mock-fcm-token")
                .platform("ANDROID")
                .build();
        when(userDeviceRepository.findByUserId(userId)).thenReturn(List.of(device));

        notificationService.notifyGoalAchieved(userId, "DAILY_STEPS", 10000.0);

        verify(userDeviceRepository).findByUserId(userId);
    }

    @Test
    void dispatchWeeklyReports_queriesActivitiesAndDispatches() {
        when(userRepository.findAll()).thenReturn(List.of(testUser));
        when(settingsRepository.findById(userId)).thenReturn(Optional.empty());

        UserDeviceEntity device = UserDeviceEntity.builder()
                .userId(userId)
                .deviceId("dev-1")
                .fcmToken("mock-fcm-token")
                .platform("ANDROID")
                .build();
        when(userDeviceRepository.findByUserId(userId)).thenReturn(List.of(device));

        when(jdbcTemplate.queryForMap(any(String.class), eq(userId), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Map.of("total_steps", 45000L, "total_dist", 32500.0));

        int sentCount = notificationService.dispatchWeeklyReports();

        assertThat(sentCount).isEqualTo(1);
    }
}
