package com.example.fitsense.common.health;

//import com.fitsense.auth.AuthProperties;
import com.example.fitsense.common.response.ApiResponse;
//import com.fitsense.common.security.AuthenticatedUser;
//import com.fitsense.common.security.CurrentUser;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import com.example.fitsense.common.security.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final Clock clock;
//    private final AuthProperties authProperties;

    public HealthController(Clock clock) {
        this.clock = clock;
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, String>> health() {

        return ApiResponse.ok(Map.of("status", "UP"));
    }

    @GetMapping("/ping-auth")
    public ApiResponse<Map<String, String>> pingAuth(
            @AuthenticationPrincipal CurrentUser currentUser
    ) {

        return ApiResponse.ok(
                Map.of(
                        "uid", currentUser.uid(),
                        "email", currentUser.email() == null
                                ? ""
                                : currentUser.email()
                )
        );
    }
}
