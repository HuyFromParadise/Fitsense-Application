package com.example.fitsense.sync.dto;

import java.time.Instant;
import java.util.List;

public record SyncReconcileResponse(List<SyncItemResult> results, Instant serverTime) {
}
