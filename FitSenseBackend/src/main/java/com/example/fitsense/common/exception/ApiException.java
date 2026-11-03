package com.example.fitsense.common.exception;

import java.util.Map;
import lombok.Getter;

@Getter
public class ApiException extends RuntimeException {

    private final ErrorCode code;
    private final transient Map<String, Object> details;

    public ApiException(ErrorCode code, String message) {
        this(code, message, Map.of());
    }

    public ApiException(ErrorCode code, String message, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.details = details == null ? Map.of() : details;
    }

    public static ApiException notImplemented(String feature) {
        return new ApiException(ErrorCode.NOT_IMPLEMENTED, feature + " is not implemented yet");
    }
}
