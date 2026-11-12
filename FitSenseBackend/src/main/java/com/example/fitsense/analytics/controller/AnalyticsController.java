package com.example.fitsense.analytics.controller;

import com.example.fitsense.analytics.dto.PeriodAnalyticsResponse;
import com.example.fitsense.analytics.service.AnalyticsService;
import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.exception.ErrorCode;
import com.example.fitsense.common.response.ApiResponse;
import com.example.fitsense.common.security.AuthenticatedUser;
import com.example.fitsense.common.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Weekly and monthly fitness analytics")
@SecurityRequirement(name = "bearerAuth")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/weekly")
    @Operation(summary = "Thống kê theo tuần, kèm so sánh tuần trước và phân rã từng ngày")
    public ApiResponse<PeriodAnalyticsResponse> weekly(
            @AuthenticatedUser CurrentUser currentUser,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate weekStart
    ) {
        return ApiResponse.ok(analyticsService.getWeeklyAnalytics(currentUser, weekStart));
    }

    @GetMapping("/monthly")
    @Operation(summary = "Thống kê theo tháng, kèm so sánh tháng trước và phân rã từng ngày")
    public ApiResponse<PeriodAnalyticsResponse> monthly(
            @AuthenticatedUser CurrentUser currentUser,
            @RequestParam(required = false) String month
    ) {
        YearMonth parsedMonth = null;
        if (month != null && !month.isBlank()) {
            try {
                parsedMonth = YearMonth.parse(month.trim());
            } catch (DateTimeParseException ex) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "month must follow format YYYY-MM");
            }
        }
        return ApiResponse.ok(analyticsService.getMonthlyAnalytics(currentUser, parsedMonth));
    }
}
