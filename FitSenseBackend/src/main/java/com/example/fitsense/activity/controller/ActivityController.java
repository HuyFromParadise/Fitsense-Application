package com.example.fitsense.activity.controller;

import com.example.fitsense.activity.dto.DailyActivityResponse;
import com.example.fitsense.activity.service.ActivityService;
import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.response.ApiResponse;
import com.example.fitsense.common.response.PageResponse;
import com.example.fitsense.common.security.AuthenticatedUser;
import com.example.fitsense.common.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
@Tag(name = "Activity", description = "Daily step activity and history")
@SecurityRequirement(name = "bearerAuth")
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping("/daily")
    @Operation(summary = "Daily activity summary (defaults to today)")
    public ApiResponse<DailyActivityResponse> daily(
            @AuthenticatedUser CurrentUser authUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String timezoneId) {
        return ApiResponse.ok(activityService.getDaily(authUser, date, timezoneId));
    }

    @GetMapping("/history")
    @Operation(summary = "Paged daily activity history")
    public ApiResponse<PageResponse<DailyActivityResponse>> history(
            @AuthenticatedUser CurrentUser authUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(activityService.getHistory(authUser, from, to, page, size));
    }

    @PostMapping("/sync")
    public ApiResponse<Void> sync() {
        throw ApiException.notImplemented("Activity sync");
    }
}
