package com.example.fitsense.notification.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceRegistrationRequest {

    @NotBlank(message = "deviceId is required")
    private String deviceId;

    @NotBlank(message = "platform is required (ANDROID or IOS)")
    private String platform;

    private String fcmToken;
}
