package com.example.fitsense.exercise.controller;

import com.example.fitsense.common.response.ApiResponse;
import com.example.fitsense.common.response.PageResponse;
import com.example.fitsense.common.security.AuthenticatedUser;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.exercise.dto.ExerciseCreateRequest;
import com.example.fitsense.exercise.dto.ExerciseDetailResponse;
import com.example.fitsense.exercise.dto.ExerciseSummaryResponse;
import com.example.fitsense.exercise.dto.ExerciseUpdateRequest;
import com.example.fitsense.exercise.entity.ExerciseType;
import com.example.fitsense.exercise.service.ExerciseService;
import com.example.fitsense.exercise.service.ExerciseService.CreateSessionResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
@Tag(name = "Exercise", description = "GPS exercise session tracking and history")
@SecurityRequirement(name = "bearerAuth")
public class ExerciseController {

    private final ExerciseService exerciseService;

    @PostMapping
    @Operation(summary = "Tạo buổi tập (session + gps points + metrics trong một transaction, idempotent theo UUID)")
    public ResponseEntity<ApiResponse<ExerciseSummaryResponse>> create(
            @AuthenticatedUser CurrentUser currentUser,
            @Valid @RequestBody ExerciseCreateRequest request
    ) {
        CreateSessionResult result = exerciseService.createSession(currentUser, request);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(ApiResponse.ok(result.summary()));
    }

    @GetMapping
    @Operation(summary = "Danh sách buổi tập, phân trang")
    public ApiResponse<PageResponse<ExerciseSummaryResponse>> list(
            @AuthenticatedUser CurrentUser currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) ExerciseType type
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        return ApiResponse.ok(exerciseService.listSessions(currentUser, type, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết buổi tập kèm toàn bộ route GPS")
    public ApiResponse<ExerciseDetailResponse> get(
            @AuthenticatedUser CurrentUser currentUser,
            @PathVariable UUID id
    ) {
        return ApiResponse.ok(exerciseService.getSessionDetail(currentUser, id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật buổi tập đã có (kết thúc session, đẩy thêm lô GPS)")
    public ApiResponse<ExerciseSummaryResponse> update(
            @AuthenticatedUser CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody ExerciseUpdateRequest request
    ) {
        return ApiResponse.ok(exerciseService.updateSession(currentUser, id, request));
    }
}
