package com.example.fitsense.notification.controller;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** F4 skeleton: routes exist from day 1 and return 501 until the feature lands. */
@RestController
@RequestMapping("/api/notifications")
public class NotificationPlaceholderController {

    @PostMapping("/devices")
    public ApiResponse<Void> registerDevice() {
        throw ApiException.notImplemented("Notifications");
    }

    @GetMapping("/settings")
    public ApiResponse<Void> getSettings() {
        throw ApiException.notImplemented("Notifications");
    }

    @PutMapping("/settings")
    public ApiResponse<Void> updateSettings() {
        throw ApiException.notImplemented("Notifications");
    }
}
