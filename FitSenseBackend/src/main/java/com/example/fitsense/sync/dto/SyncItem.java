package com.example.fitsense.sync.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record SyncItem(
        @NotNull SyncEntityType entityType,
        @NotBlank @Size(max = 200) String clientId,
        @NotNull Map<String, Object> payload
) {
}
