package com.example.fitsense.user.controller;

import com.example.fitsense.common.response.ApiResponse;
import com.example.fitsense.common.security.AuthenticatedUser;
import com.example.fitsense.common.security.CurrentUser;
import com.example.fitsense.user.dto.UserResponse;
import com.example.fitsense.user.dto.UserUpdateRequest;
import com.example.fitsense.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User", description = "User profile and account management")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Lấy user hiện tại, tự tạo theo firebase_uid lần đầu")
    public ApiResponse<UserResponse> me(@AuthenticatedUser CurrentUser currentUser) {
        UserResponse user = userService.getOrCreateCurrentUser(currentUser);
        return ApiResponse.ok(user);
    }

    @PutMapping("/me")
    @Operation(summary = "Cập nhật profile người dùng")
    public ApiResponse<UserResponse> updateProfile(
            @AuthenticatedUser CurrentUser currentUser,
            @Valid @RequestBody UserUpdateRequest request
    ) {
        UserResponse updated = userService.updateCurrentUser(currentUser, request);
        return ApiResponse.ok(updated);
    }

    @DeleteMapping("/me")
    @Operation(summary = "Xóa tài khoản người dùng vĩnh viễn (cascade MySQL, Firestore, Firebase Auth)")
    public ApiResponse<Void> deleteAccount(@AuthenticatedUser CurrentUser currentUser) {
        userService.deleteCurrentUser(currentUser);
        return ApiResponse.ok(null);
    }
}
