package com.example.fitsense.common.health;

import com.fitsense.auth.AuthProperties;
import com.example.fitsense.common.response.ApiResponse;
import com.fitsense.common.security.AuthenticatedUser;
import com.fitsense.common.security.CurrentUser;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final Clock clock;
    private final AuthProperties authProperties;

    public HealthController(Clock clock, AuthProperties authProperties) {
        this.clock = clock;
        this.authProperties = authProperties;
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("service", "fitsense-backend");
        body.put("authMode", authProperties.mode().name().toLowerCase());
        body.put("timestamp", Instant.now(clock));
        return ApiResponse.ok(body);
    }

    @GetMapping("/ping-auth")
    public ApiResponse<Map<String, Object>> pingAuth(@AuthenticatedUser CurrentUser currentUser) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", "pong");
        body.put("firebaseUid", currentUser.firebaseUid());
        body.put("userId", currentUser.userId().toString());
        body.put("timestamp", Instant.now(clock));
        return ApiResponse.ok(body);
    }
}
