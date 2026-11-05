package com.example.fitsense.goal.controller;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.response.ApiResponse;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** F7 skeleton: routes exist from day 1 and return 501 until the feature lands. */
@RestController
@RequestMapping("/api/goals")
public class GoalPlaceholderController {

    @GetMapping
    public ApiResponse<Void> list() {
        throw ApiException.notImplemented("Goals");
    }

    @PostMapping
    public ApiResponse<Void> create() {
        throw ApiException.notImplemented("Goals");
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable String id) {
        throw ApiException.notImplemented("Goals");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        throw ApiException.notImplemented("Goals");
    }
}
