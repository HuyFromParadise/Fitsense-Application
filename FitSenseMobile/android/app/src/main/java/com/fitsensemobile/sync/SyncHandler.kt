package com.fitsensemobile.sync

/** Mỗi feature implement handler của mình; SyncModule (B) gọi qua interface này. */
interface SyncHandler {
    val entityType: String
    fun collectPending(limit: Int): List<Map<String, Any?>>
}
