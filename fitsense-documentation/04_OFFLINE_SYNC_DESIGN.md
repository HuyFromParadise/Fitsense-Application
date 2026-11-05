## 5. Thiết kế SyncHandler (để F8 không phụ thuộc cứng vào F2, F5)

B viết lõi đồng bộ, mỗi feature có dữ liệu cần đồng bộ tự viết một **handler**. Ngày 1 chỉ cần khai báo interface.

```kotlin
interface SyncHandler {
    val entityType: String                       // "EXERCISE", "DAILY_ACTIVITY", ...
    suspend fun collectPending(): List<SyncItem> // lấy bản ghi PENDING từ Room
    suspend fun buildRequest(item: SyncItem): SyncRequestItem
    suspend fun onResult(item: SyncItem, result: SyncResult) // CREATED/DUPLICATE/CONFLICT/REJECTED
}
```

Phía backend tương tự: `SyncProcessor` theo từng `entityType`, `POST /api/sync/reconcile` chỉ điều phối.

| Handler | Người viết | Ngày |
|---|---|---|
| `ExerciseSyncHandler` + `ExerciseSyncProcessor` | A | 9 |
| `DailyActivitySyncHandler` + processor | B | 9 |
| Lõi `SyncManager`, queue, backoff, `reconcile` | B | 8-10 |

---
