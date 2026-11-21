package com.example.fitsense.sync.controller;

import com.example.fitsense.common.response.ApiResponse;
import com.example.fitsense.common.security.AuthenticatedUser;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.sync.dto.SyncReconcileRequest;
import com.example.fitsense.sync.dto.SyncReconcileResponse;
import com.example.fitsense.sync.service.SyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
@Tag(name = "Sync", description = "Offline sync reconciliation")
@SecurityRequirement(name = "bearerAuth")
public class SyncController {

    private final SyncService syncService;

    @PostMapping("/reconcile")
    @Operation(summary = "Reconcile a batch of offline changes (max 500 items)")
    public ApiResponse<SyncReconcileResponse> reconcile(
            @AuthenticatedUser CurrentUser authUser,
            @Valid @RequestBody SyncReconcileRequest request) {
        return ApiResponse.ok(syncService.reconcile(authUser, request));
    }
}
