# F8 — OFFLINE SYNC

**Owner:** Member B  
**Scope:** Local queue, retry/backoff, reconciliation, conflict rules, and sync handlers.

## Implementation tasks from the project roadmap

The tasks below are extracted from the day-by-day plan. Keep the original sequence and completion conditions.

### #### Ngày 8

**B: [F8] Offline Sync (lõi client)**
- [ ] `sync_queue` DAO, `SyncManager`: NetInfo phát hiện mạng, hàng đợi, retry **exponential backoff + jitter**, chỉ chuyển `SYNCED` sau khi server xác nhận, không xóa local trước đó.
- [ ] Interface `SyncHandler` (mục 5), cơ chế đăng ký handler.
- [ ] Trạng thái sync trong UI (số bản ghi chờ, biểu tượng đồng bộ), store `useSyncStatus`.

**Hoàn thành khi:** buổi tập bị kill giữa chừng khôi phục được; SyncManager chạy với một handler giả.

### #### Ngày 9

**B: [F8] Sync (server + handler Daily Activity)**
- [ ] `POST /api/sync/reconcile`: xử lý từng mục độc lập, trả `CREATED`/`DUPLICATE`/`CONFLICT`/`REJECTED` kèm lý do. Cập nhật `user_devices.last_sync_at`.
- [ ] `DailyActivitySyncHandler` + processor, đẩy theo `activity_date` + `timezone_id`.
- [ ] Quy tắc conflict: exercise server thắng; daily summary bản `updated_at` mới hơn thắng; profile/goals last-write-wins.
- [ ] Test gọi trùng nhiều lần, lô bị ngắt giữa chừng.

**Hoàn thành khi:** tắt Wi-Fi và dữ liệu di động, ghi buổi tập, bật lại thì server nhận đúng **một** bản.

### #### Ngày 10

**B: [F8] Sync (hoàn thiện)**
- [ ] Kịch bản kiểm thử end-to-end: offline → ghi → online → sync, gọi sync hai lần, mất mạng giữa lúc sync, kill app giữa lúc sync.
- [ ] Xử lý `FAILED` và thử lại, thông báo lỗi sync (tùy chọn).
- [ ] Kiểm thử reboot cho Steps.

**Hoàn thành khi:** AC-10, 11, 12 đạt; biểu đồ tuần/tháng hiển thị dữ liệu thật hoặc seed.
## Cross-feature interfaces

- Member B owns the SyncManager core, queue, backoff, and reconciliation orchestration.
- Each feature owns its own SyncHandler/processor for its data type.
- Member A implements `ExerciseSyncHandler` + `ExerciseSyncProcessor`.
- Member B implements `DailyActivitySyncHandler` + processor.


## Definition of done

- Complete the feature's listed tasks and acceptance conditions.
- Add relevant tests.
- Test on a physical Android device where the feature uses native functionality.
- Update the shared API/native/database contract before changing an interface used by the other member.
- Merge the feature branch into `dev` and request review.
