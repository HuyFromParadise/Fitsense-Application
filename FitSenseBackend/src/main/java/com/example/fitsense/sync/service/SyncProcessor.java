package com.example.fitsense.sync.service;

import com.example.fitsense.sync.dto.SyncEntityType;
import com.example.fitsense.sync.dto.SyncItem;
import com.example.fitsense.sync.dto.SyncItemResult;

public interface SyncProcessor {

    SyncEntityType entityType();

    SyncItemResult process(SyncContext context, SyncItem item);
}
