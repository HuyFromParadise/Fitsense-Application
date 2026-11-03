package com.example.fitsense.activity.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/activities")
public class ActivityPlaceholderController {
    @GetMapping("/_placeholder")
    public ResponseEntity<String> placeholder() {

        return ResponseEntity
                .status(HttpStatus.NOT_IMPLEMENTED)
                .body("Exercise feature is not implemented yet");
    }
}
