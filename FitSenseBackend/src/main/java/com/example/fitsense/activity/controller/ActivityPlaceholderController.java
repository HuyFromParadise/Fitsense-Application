package com.example.fitsense.activity.controller;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** F5 skeleton: routes exist from day 1 and return 501 until the feature lands. */
@RestController
@RequestMapping("/api/activities")
public class ActivityPlaceholderController {

    @GetMapping("/daily")
    public ApiResponse<Void> daily() {
        throw ApiException.notImplemented("Daily activity");
    }

    @GetMapping("/history")
    public ApiResponse<Void> history() {
        throw ApiException.notImplemented("Activity history");
    }

    @PostMapping("/sync")
    public ApiResponse<Void> sync() {
        throw ApiException.notImplemented("Activity sync");
    }
}
