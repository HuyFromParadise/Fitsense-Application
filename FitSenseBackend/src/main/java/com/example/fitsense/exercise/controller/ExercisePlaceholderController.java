package com.example.fitsense.exercise.controller;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** F2 skeleton: routes exist from day 1 and return 501 until the feature lands. */
@RestController
@RequestMapping("/api/exercises")
public class ExercisePlaceholderController {

    @GetMapping
    public ApiResponse<Void> list() {
        throw ApiException.notImplemented("Exercise history");
    }

    @PostMapping
    public ApiResponse<Void> create() {
        throw ApiException.notImplemented("Exercise history");
    }

    @GetMapping("/{id}")
    public ApiResponse<Void> get(@PathVariable String id) {
        throw ApiException.notImplemented("Exercise history");
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable String id) {
        throw ApiException.notImplemented("Exercise history");
    }
}
