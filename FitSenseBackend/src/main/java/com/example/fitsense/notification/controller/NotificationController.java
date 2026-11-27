package com.example.fitsense.notification.controller;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.response.ApiResponse;
import com.example.fitsense.common.security.AuthenticatedUser;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.notification.dto.DeviceRegistrationRequest;
import com.example.fitsense.notification.dto.NotificationSettingsDto;
import com.example.fitsense.notification.service.NotificationService;
import com.example.fitsense.user.entity.UserEntity;
import com.example.fitsense.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification", description = "FCM push notifications and user settings")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @Value("${fitsense.notifications.admin-trigger-key:}")
    private String adminTriggerKey;

    @PostMapping("/devices")
    @Operation(summary = "Đăng ký thiết bị và FCM token nhận thông báo")
    public ResponseEntity<Void> registerDevice(
            @AuthenticatedUser CurrentUser authUser,
            @Valid @RequestBody DeviceRegistrationRequest request
    ) {
        notificationService.registerDevice(authUser, request);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/devices")
    @Operation(summary = "Cập nhật thiết bị và FCM token nhận thông báo")
    public ResponseEntity<Void> updateDevice(
            @AuthenticatedUser CurrentUser authUser,
            @Valid @RequestBody DeviceRegistrationRequest request
    ) {
        notificationService.registerDevice(authUser, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/settings")
    @Operation(summary = "Lấy cài đặt thông báo của user")
    public ApiResponse<NotificationSettingsDto> getSettings(@AuthenticatedUser CurrentUser authUser) {
        NotificationSettingsDto settings = notificationService.getSettings(authUser);
        return ApiResponse.ok(settings);
    }

    @PutMapping("/settings")
    @Operation(summary = "Cập nhật cài đặt thông báo")
    public ApiResponse<NotificationSettingsDto> updateSettings(
            @AuthenticatedUser CurrentUser authUser,
            @Valid @RequestBody NotificationSettingsDto request
    ) {
        NotificationSettingsDto updated = notificationService.updateSettings(authUser, request);
        return ApiResponse.ok(updated);
    }

    @PostMapping("/test-send")
    @Operation(summary = "Gửi thông báo test về thiết bị của user hiện tại")
    public ApiResponse<Map<String, Object>> testSend(@AuthenticatedUser CurrentUser authUser) {
        UserEntity user = userRepository.findByFirebaseUid(authUser.uid())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "User not found"));
        int count = notificationService.sendPushNotification(
                user.getId(),
                "FitSense Test",
                "Thông báo thử nghiệm từ hệ thống FitSense thành công! 🚀",
                Map.of("type", "TEST")
        );
        return ApiResponse.ok(Map.of("dispatchedCount", count));
    }

    @PostMapping("/weekly-report/trigger")
    @Operation(summary = "Kích hoạt gửi báo cáo tuần thủ công (yêu cầu X-Admin-Key)")
    public ApiResponse<Map<String, Object>> triggerWeeklyReport(
            @RequestHeader(value = "X-Admin-Key", required = false) String providedKey
    ) {
        if (!StringUtils.hasText(adminTriggerKey)
                || !StringUtils.hasText(providedKey)
                || !MessageDigest.isEqual(
                        adminTriggerKey.getBytes(StandardCharsets.UTF_8),
                        providedKey.getBytes(StandardCharsets.UTF_8))) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Admin trigger key required");
        }
        int count = notificationService.dispatchWeeklyReports();
        return ApiResponse.ok(Map.of("reportsSent", count));
    }
}
