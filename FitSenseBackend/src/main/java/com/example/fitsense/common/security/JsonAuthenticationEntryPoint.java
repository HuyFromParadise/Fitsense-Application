package com.example.fitsense.common.security;

import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.response.ApiError;
import com.example.fitsense.common.response.ApiResponse;
import tools.jackson.databind.json.JsonMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/** Returns the shared {@link ApiResponse} error envelope instead of the servlet default page. */
@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final JsonMapper jsonMapper;
    private final Clock clock;

    public JsonAuthenticationEntryPoint(JsonMapper jsonMapper, Clock clock) {
        this.jsonMapper = jsonMapper;
        this.clock = clock;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        ApiError error = ApiError.of(
                ErrorCode.UNAUTHORIZED,
                "Authentication required",
                Map.of(),
                Instant.now(clock));

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        jsonMapper.writeValue(response.getOutputStream(), ApiResponse.fail(error));
    }
}
