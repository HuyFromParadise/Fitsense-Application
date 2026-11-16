package com.example.fitsense.notification.controller;

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
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PostMapping("/devices")
    @Operation(summary = "Đăng ký thiết bị và FCM token nhận thông báo")
    public ApiResponse<Void> registerDevice(
            @AuthenticatedUser CurrentUser authUser,
            @Valid @RequestBody DeviceRegistrationRequest request
    ) {
        notificationService.registerDevice(authUser, request);
        return ApiResponse.ok(null);
    }

    @PutMapping("/devices")
    @Operation(summary = "Cập nhật thiết bị và FCM token nhận thông báo")
    public ApiResponse<Void> updateDevice(
            @AuthenticatedUser CurrentUser authUser,
            @Valid @RequestBody DeviceRegistrationRequest request
    ) {
        notificationService.registerDevice(authUser, request);
        return ApiResponse.ok(null);
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
            @RequestBody NotificationSettingsDto request
    ) {
        NotificationSettingsDto updated = notificationService.updateSettings(authUser, request);
        return ApiResponse.ok(updated);
    }

    @PostMapping("/test-send")
    @Operation(summary = "Gửi thông báo test về thiết bị của user hiện tại")
    public ApiResponse<Map<String, Object>> testSend(@AuthenticatedUser CurrentUser authUser) {
        UserEntity user = userRepository.findByFirebaseUid(authUser.uid()).orElseThrow();
        int count = notificationService.sendPushNotification(
                user.getId(),
                "FitSense Test",
                "Thông báo thử nghiệm từ hệ thống FitSense thành công! 🚀",
                Map.of("type", "TEST")
        );
        return ApiResponse.ok(Map.of("dispatchedCount", count));
    }

    @PostMapping("/weekly-report/trigger")
    @Operation(summary = "Kích hoạt gửi báo cáo tuần thủ công")
    public ApiResponse<Map<String, Object>> triggerWeeklyReport() {
        int count = notificationService.dispatchWeeklyReports();
        return ApiResponse.ok(Map.of("reportsSent", count));
    }
}
