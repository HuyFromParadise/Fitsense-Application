package com.example.fitsense.analytics.controller;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** F3 skeleton: routes exist from day 1 and return 501 until the feature lands. */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsPlaceholderController {

    @GetMapping("/weekly")
    public ApiResponse<Void> weekly() {
        throw ApiException.notImplemented("Analytics");
    }

    @GetMapping("/monthly")
    public ApiResponse<Void> monthly() {
        throw ApiException.notImplemented("Analytics");
    }
}
