package com.example.fitsense.sync.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SyncReconcileRequest(
        @NotBlank @Size(max = 128) String deviceId,
        @NotEmpty @Size(max = 500) List<@Valid SyncItem> items
) {
}
