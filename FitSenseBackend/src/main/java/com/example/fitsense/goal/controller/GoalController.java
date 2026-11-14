package com.example.fitsense.goal.controller;

import com.example.fitsense.common.response.ApiResponse;
import com.example.fitsense.common.security.AuthenticatedUser;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.goal.dto.GoalResponse;
import com.example.fitsense.goal.dto.GoalUpsertRequest;
import com.example.fitsense.goal.service.GoalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
@Tag(name = "Goal", description = "User goals (daily and weekly)")
@SecurityRequirement(name = "bearerAuth")
public class GoalController {

    private final GoalService goalService;

    @PostMapping
    @Operation(summary = "Tạo mục tiêu")
    public ResponseEntity<ApiResponse<GoalResponse>> create(
            @AuthenticatedUser CurrentUser currentUser,
            @Valid @RequestBody GoalUpsertRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(goalService.create(currentUser, request)));
    }

    @GetMapping
    @Operation(summary = "Danh sách mục tiêu đang hoạt động")
    public ApiResponse<List<GoalResponse>> list(@AuthenticatedUser CurrentUser currentUser) {
        return ApiResponse.ok(goalService.listActive(currentUser));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Sửa mục tiêu")
    public ApiResponse<GoalResponse> update(
            @AuthenticatedUser CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody GoalUpsertRequest request
    ) {
        return ApiResponse.ok(goalService.update(currentUser, id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa mục tiêu")
    public ResponseEntity<Void> delete(
            @AuthenticatedUser CurrentUser currentUser,
            @PathVariable UUID id
    ) {
        goalService.delete(currentUser, id);
        return ResponseEntity.noContent().build();
    }
}
