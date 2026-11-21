package com.example.fitsense.sync.service;

import com.example.fitsense.common.security.CurrentUser;
import java.util.UUID;

public record SyncContext(UUID userId, CurrentUser authUser) {
}
