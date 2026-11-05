package com.example.fitsense.user.controller;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.response.ApiResponse;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** F1 skeleton: routes exist from day 1 and return 501 until the feature lands. */
@RestController
@RequestMapping("/api/users")
public class UserPlaceholderController {

    @GetMapping("/me")
    public ApiResponse<Void> me() {
        throw ApiException.notImplemented("User profile");
    }

    @PutMapping("/me")
    public ApiResponse<Void> updateProfile() {
        throw ApiException.notImplemented("User profile");
    }

    @DeleteMapping("/me")
    public ApiResponse<Void> deleteAccount() {
        throw ApiException.notImplemented("User profile");
    }
}
