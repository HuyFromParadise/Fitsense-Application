package com.example.fitsense.common.response;

import com.example.fitsense.common.exception.ErrorCode;
import java.time.Instant;
import java.util.Map;

public record ApiError(String code, String message, Map<String, Object> details, Instant timestamp) {

    public static ApiError of(ErrorCode code, String message, Map<String, Object> details, Instant timestamp) {
        return new ApiError(code.name(), message, details, timestamp);
    }
}
