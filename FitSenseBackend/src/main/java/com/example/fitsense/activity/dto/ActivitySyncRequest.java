package com.example.fitsense.activity.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ActivitySyncRequest(
        @NotEmpty @Size(max = 31) List<@Valid DailyActivityUpsert> items
) {
}
