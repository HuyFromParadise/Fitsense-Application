# F8 Ngày 9 — Server reconcile + Daily Activity handler — Design (ngắn)

Ngày: 2026-11-19 · Người làm: B · Trạng thái: chờ duyệt

## Mục tiêu

Dựng `POST /api/sync/reconcile` tổng quát để A cắm `ExerciseSyncProcessor` và B cắm
`DailyActivitySyncProcessor`, mỗi item xử lý độc lập, cập nhật `user_devices.last_sync_at`.

## Vì sao

Client Ngày 8 đang sync qua `POST /api/activities/sync` và đã chạy E2E. Endpoint đó chỉ phục vụ
`DAILY_ACTIVITY`. Plan Ngày 9 cần một entrypoint chung theo `entityType` để A nối processor
`EXERCISE` và để Ngày 10 test lô trộn. Không chuyển client sang reconcile trong task này (đã chốt
với người dùng: cách 1).

## Phạm vi

**Làm**

- `SyncController` thay `SyncPlaceholderController`.
- DTO: `SyncItem` (`entityType`, `clientId`, `payload`), `SyncReconcileRequest` (`deviceId`, `items` ≤500),
  `SyncReconcileResponse` (`results`, `serverTime`).
- Interface `SyncProcessor` (`entityType()`, `process(SyncContext, SyncItem)`); `SyncContext(userId, authUser)`.
- `DailyActivitySyncProcessor` dùng lại logic LWW của `ActivityService` (mở `upsert(userId, item)` công khai,
  validate timezone nằm trong đó).
- `ExerciseSyncProcessorAdapter` bọc `ExerciseSyncProcessor` của A (không sửa file A), map status string
  sang `SyncStatus`.
- `SyncService.reconcile`: registry theo `entityType`; item không có processor → `REJECTED`; exception của
  một item → `REJECTED` cho item đó, không ảnh hưởng item khác; cuối cùng upsert `last_sync_at` theo
  `(user_id, device_id)`, tạo row `platform='android'`, `fcm_token=NULL` nếu chưa có (lỗi bookkeeping chỉ log).
- Test JUnit: dispatch theo entity, cô lập lỗi từng item, unknown entity, DAILY payload đúng/sai,
  idempotent (processor trả `DUPLICATE`), `last_sync_at` update/insert.

**Không làm**

- Không đổi client Day 8, không thêm `deviceId` phía mobile.
- Không viết native `DailyActivitySyncHandler`/`SyncManager` Kotlin — approach A đã thay bằng `syncManager` JS.
- Không sửa `ExerciseSyncProcessor`, `NotificationService`, `SecurityConfig`, V1/V2, openapi (Ngày 13).

## Thiết kế

- `SyncService` không bọc `@Transactional` cho cả lô; mỗi processor/`ActivityService.upsert` tự có transaction
  riêng, nên lỗi một item không rollback item khác.
- Item lỗi được trả `REJECTED` + `reason`, không ném 500 cho cả lô.
- `last_sync_at` dùng `Clock` của app; response `serverTime` cùng clock.
- Thứ tự results giữ đúng thứ tự `items`.

## Rủi ro / đánh đổi

- Tồn tại hai entrypoint cho daily activity (`/api/activities/sync` và `/api/sync/reconcile`); chấp nhận,
  Ngày 10 có thể hợp nhất nếu cần.
- Adapter phụ thuộc chữ ký `ExerciseSyncProcessor.process(CurrentUser, Map)` hiện tại của A; nếu A đổi,
  chỉ sửa adapter.
- Không validate “activityDate không ở tương lai” (plan ghi tùy chọn) để tránh lệch đồng hồ thiết bị.

## Verify

- `mvnw.cmd -o test -Dtest=SyncServiceTest,DailyActivitySyncProcessorTest,ActivityServiceTest`.
- Chạy backend profile dev cổng 9090; `curl` reconcile với `dev-token`: lần 1 `CREATED`, lần 2 `DUPLICATE`,
  timestamp cũ hơn `CONFLICT`; query `daily_activities` đúng 1 dòng/ngày và `user_devices.last_sync_at` có giá trị.
