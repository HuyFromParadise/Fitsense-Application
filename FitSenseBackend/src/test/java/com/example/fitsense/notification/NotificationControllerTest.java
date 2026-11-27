package com.example.fitsense.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.response.ApiResponse;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.notification.controller.NotificationController;
import com.example.fitsense.notification.dto.DeviceRegistrationRequest;
import com.example.fitsense.notification.service.NotificationService;
import com.example.fitsense.user.repository.UserRepository;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationController controller;

    @Test
    void registerDevice_returns204NoContent() {
        CurrentUser user = new CurrentUser("uid-1", "a@fitsense.app");
        DeviceRegistrationRequest req = new DeviceRegistrationRequest("dev-1", "android", "fcm-1");

        ResponseEntity<Void> res = controller.registerDevice(user, req);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(notificationService).registerDevice(user, req);
    }

    @Test
    void triggerWeeklyReport_rejectsMissingOrWrongAdminKey() {
        ReflectionTestUtils.setField(controller, "adminTriggerKey", "secret-123");

        assertThatThrownBy(() -> controller.triggerWeeklyReport(null))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getCode())
                .isEqualTo(ErrorCode.FORBIDDEN);

        assertThatThrownBy(() -> controller.triggerWeeklyReport("wrong"))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getCode())
                .isEqualTo(ErrorCode.FORBIDDEN);

        verify(notificationService, never()).dispatchWeeklyReports();
    }

    @Test
    void triggerWeeklyReport_allowsValidAdminKey() {
        ReflectionTestUtils.setField(controller, "adminTriggerKey", "secret-123");
        when(notificationService.dispatchWeeklyReports()).thenReturn(2);

        ApiResponse<Map<String, Object>> res = controller.triggerWeeklyReport("secret-123");

        assertThat(res.data()).containsEntry("reportsSent", 2);
        verify(notificationService).dispatchWeeklyReports();
    }
}
