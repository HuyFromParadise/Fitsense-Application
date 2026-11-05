package com.example.fitsense.common.health;

import com.example.fitsense.auth.AuthMode;
import com.example.fitsense.common.response.ApiResponse;
import com.example.fitsense.common.security.AuthenticatedUser;
import com.example.fitsense.common.security.CurrentUser;
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
    private final AuthMode authMode;

    public HealthController(Clock clock, AuthMode authMode) {
        this.clock = clock;
        this.authMode = authMode;
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, String>> health() {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("authMode", authMode.externalName());
        return ApiResponse.ok(body);
    }

    @GetMapping("/ping-auth")
    public ApiResponse<Map<String, Object>> pingAuth(@AuthenticatedUser CurrentUser currentUser) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", "Authenticated");
        body.put("firebaseUid", currentUser.uid());
        // F1 replaces this with the MySQL user id once the users table is wired up.
        body.put("userId", currentUser.uid());
        body.put("timestamp", Instant.now(clock));
        return ApiResponse.ok(body);
    }
}
