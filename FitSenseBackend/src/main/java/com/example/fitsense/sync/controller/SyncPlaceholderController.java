package com.example.fitsense.sync.controller;

import com.example.fitsense.common.exception.ApiException;
import com.example.fitsense.common.response.ApiResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** F8 skeleton: routes exist from day 1 and return 501 until the feature lands. */
@RestController
@RequestMapping("/api/sync")
public class SyncPlaceholderController {

    @PostMapping("/reconcile")
    public ApiResponse<Void> reconcile() {
        throw ApiException.notImplemented("Offline sync");
    }
}
