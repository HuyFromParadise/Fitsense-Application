# TESTING

## F8 — Offline sync E2E (Day 10)

Chuẩn bị: backend chạy (`dev-token` hoặc tài khoản Firebase), app cài trên máy thật, đã có ít nhất 1 ngày `local_activity` (`sync_state = PENDING`).

Kiểm tra phía server:

```sql
SELECT * FROM daily_activities WHERE user_id = '<uuid>';
SELECT device_id, last_sync_at FROM user_devices WHERE user_id = '<uuid>';
```

| # | Kịch bản | Các bước | Kết quả mong đợi | Test tự động | Máy thật |
|---|---|---|---|---|---|
| 1 | Offline ghi → online sync đúng 1 bản | Airplane mode → đi bộ để Dashboard ghi activity → tắt airplane mode → chờ sync | Đúng 1 row `daily_activities` cho ngày đó; chip về "Đã đồng bộ" | `SyncServiceTest` (upsert), `syncManager.test.ts` (backfill, batch) | ☐ chưa chạy |
| 2 | Gọi sync 2 lần liên tiếp | Sync xong → bấm "Thử lại" hoặc để NetInfo bắn lại | Không tạo row mới; server trả `DUPLICATE`; không có request khi queue rỗng | `SyncServiceTest` (idempotent), `a second sync after success sends no further requests` | ☐ chưa chạy |
| 3 | Mất mạng giữa lúc sync | Bật sync → tắt mạng khi request đang chạy | Item `FAILED` + `next_attempt_at` trong tương lai; có mạng lại thì retry; không mất item | `network errors retry later with backoff`, `HTTP 400 ... no retry` | ☐ chưa chạy |
| 4 | Kill app giữa lúc sync | Kill app khi item đang `SYNCING` → mở lại | Row `SYNCING` được đưa về `PENDING`, sync tiếp, không nhân đôi | `resets stuck SYNCING rows ...`, `SyncServiceTest` (DUPLICATE) | ☐ chưa chạy |
| 5 | Server trả `REJECTED` | Gửi item sai dữ liệu (ví dụ steps âm) | Item `FAILED`, `next_attempt_at = MAX`, không tự retry; lỗi hiện trên chip | `REJECTED item fails permanently without scheduling a retry`, `DailyActivitySyncProcessorTest` | ☐ chưa chạy |
| 6 | Server trả `CONFLICT` | Ghi activity cũ hơn bản server (ví dụ sửa `client_updated_at` trong DB) rồi sync | Local bị ghi đè bằng `serverVersion`, queue `SYNCED` | `CONFLICT overwrites local activity with the server copy`, `SyncServiceTest` (CONFLICT) | ☐ chưa chạy |

### Kiểm thử reboot cho Steps (Day 10)

| Kịch bản | Kết quả mong đợi | Máy thật |
|---|---|---|
| Kill app → mở lại | Số bước hôm nay không mất, không tăng ảo | ☐ chưa chạy |
| Reboot máy → mở app | Số bước trước reboot còn, tiếp tục đếm đúng | ☐ chưa chạy |

Ghi kết quả máy thật (thiết bị, Android version, ngày chạy) vào cột cuối; lỗi phát hiện ghi vào `BUGS.md`.

## F9 — Local notification (Day 11)

Chuẩn bị: app cài trên máy thật, có quyền `POST_NOTIFICATIONS`, backend không cần cho notification cục bộ.

| # | Kịch bản | Các bước | Kết quả mong đợi | Test tự động | Máy thật |
|---|---|---|---|---|---|
| 1 | Bật nhắc nhở cục bộ | Mở Profile → Cài đặt thông báo → Bật "Nhắc nhở cục bộ" → chọn khung giờ 08:00-21:00 | WorkManager `fitsense_daily_reminder` được enqueue; hiển thị toast/thành công | — | ☐ chưa chạy |
| 2 | Nhắc đạt bước (cuối khung giờ) | Đặt khung giờ kết thúc gần giờ hiện tại (ví dụ +5 phút) → steps < 8000 → chờ đến giờ | Thông báo "Chưa đạt mục tiêu bước chân" xuất hiện với channel `fitsense_goal` | — | ☐ chưa chạy |
| 3 | Nhắc ít vận động (inactivity) | Không đi bộ 60-90 phút trong khung giờ | Thông báo "Đã lâu không vận động" xuất hiện với channel `fitsense_activity` | — | ☐ chưa chạy |
| 4 | Không gửi ngoài khung giờ | Đặt khung giờ 22:00-23:00 (ngoài giờ hiện tại) → chờ | Không có thông báo nào được gửi | — | ☐ chưa chạy |
| 5 | Từ chối POST_NOTIFICATIONS | Cài đặt ứng dụng → từ chối quyền thông báo → bật nhắc nhở | Không crash; Alert hướng dẫn bật quyền | — | ☐ chưa chạy |
| 6 | Hoàn thành bài tập | Bắt đầu bài tập (Exercise tab) → Finish → nhận thông báo | Thông báo "Hoàn thành bài tập! 🎉" với loại, quãng đường, thời gian | — | ☐ chưa chạy |
| 7 | Reboot → nhắc nhở vẫn chạy | Bật nhắc nhở → reboot máy → mở app không cần bật lại | WorkManager tự reschedule qua `BootReceiver` | — | ☐ chưa chạy |
| 8 | Thử thông báo cục bộ | Màn hình Cài đặt thông báo → nút "Thử cục bộ (WorkManager)" | Thông báo test xuất hiện | — | ☐ chưa chạy |

### Đo pin 30 phút (Day 11 - chưa đo được trong session này)

| Thiết bị | Android version | Pin trước | Pin sau | Mất | Baseline (không tracking) | Ghi chú |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | Chưa có máy thật trong session này |

> **Lưu ý:** Đo pin 30 phút tracking yêu cầu máy thật chạy `LocationForegroundService` (feature của A). Đề xuất gửi A: interval GPS thích ứng 2-5s, `PRIORITY_BALANCED`, tắt sensor khi không cần.

## Lệnh chạy test

```bash
# Backend
cd FitSenseBackend && ./mvnw test

# Mobile
cd FitSenseMobile && npx tsc --noEmit && npx jest
```
