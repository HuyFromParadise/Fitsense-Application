# F8 Ngày 8 — Client sync (approach A) — Design

Ngày: 2026-11-16 · Người làm: B · Trạng thái: chờ duyệt

## Mục tiêu

Đưa `local_activity` (bước chân/ngày) lên server một cách an toàn khi có mạng, và làm cho chip
"Đã đồng bộ" trên Dashboard phản ánh đúng trạng thái thật.

## Vì sao

Hiện tại điện thoại ghi `local_activity` với `sync_state = PENDING` nhưng không có gì đẩy lên:
`sync_queue` rỗng, `daily_activities` trên MySQL luôn 0 dòng. Chip lại đọc `sync_queue` nên hiện
"Đã đồng bộ" sai.

## Phạm vi

**Làm**

- Enqueue `DAILY_ACTIVITY` mỗi khi Dashboard ghi `local_activity` (10 giây/lần + lúc unmount);
  enqueue lại cùng ngày phải **cập nhật payload** và đưa row về `PENDING`.
- Sync khi app khởi động (sau khi auth resolve), khi NetInfo báo có mạng, và theo hẹn backoff.
- Backfill các `local_activity` còn `PENDING` từ trước, drain theo lô ≤31 (tối đa 10 lô/lần).
- Gọi `/api/activities/sync` (endpoint Ngày 7) theo lô ≤31 item.
- Xử lý `CREATED` / `DUPLICATE` / `CONFLICT` / lỗi mạng; retry có backoff + jitter.
- Cập nhật `useSyncStatus` để chip hiển thị đúng (kể cả item `FAILED`).

**Không làm**

- Background sync khi app bị kill (Ngày 8 không yêu cầu).
- `/api/sync/reconcile` và xử lý `serverVersion` chi tiết (Ngày 9).
- `EXERCISE` handler (A sở hữu; registry vẫn nhận handler, nhưng Ngày 8 không xử lý row này).
- Nút sync thủ công / thay đổi UI Dashboard.
- Migration Room: `sync_queue` đã có unique index `(entity_type, client_id)`; `local_activity` không
  thêm cột user.

**Chống mục tiêu**

- Không tạo bản ghi trùng trên server.
- Không xoá dữ liệu local trước khi server xác nhận.
- Không retry vô hạn, không chặn UI.

## Phương án

**A. JS orchestrator (đã chọn)** — Native chỉ mở rộng DAO/module thành primitive hàng đợi; JS
`syncManager` dùng `axios` + NetInfo sẵn có, tái dùng interceptor token. Ít code, dễ test Jest.
Đổi lại: không sync khi JS không chạy.

**B. Native SyncManager + OkHttp** — Đúng plan gốc, chạy nền được, nhưng lặp tầng HTTP/token, thêm
dependency, test khó hơn. Không chọn cho Ngày 8.

## Quyết định đã chốt

- **Queue lifecycle:** `enqueue` cùng `(entityType, clientId)` = cập nhật payload +
  `clientUpdatedAtMs`, reset `state='PENDING'`, `attempts=0`, `next_attempt_at=now`. Không dùng
  `IGNORE` (nếu không, mỗi ngày chỉ sync đúng giá trị đầu tiên).
- **Dọn queue:** `deleteSynced` chạy lúc app start, xoá row `SYNCED` cũ hơn 30 ngày.
- **Backfill + drain:** lúc start, enqueue mọi `local_activity` có `sync_state != 'SYNCED'` (nếu
  chưa có trong queue), rồi drain tối đa 10 lô × 31 item mỗi lần chạy.
- **Lọc entity:** `getDue` chỉ trả `entity_type = 'DAILY_ACTIVITY'`; row `EXERCISE` của A nằm im.
- **Retry:** `setTimeout` hẹn `next_attempt_at` sớm nhất khi đang online; clear khi offline/unmount.
- **Lỗi 400:** cả lô → `FAILED`, không retry (payload do app sinh nên 400 là lỗi dữ liệu thật).
- **Chip:** `pending` = `PENDING + SYNCING + FAILED`; có lỗi thì hiện "chờ đồng bộ" màu cảnh báo,
  không bao giờ báo "Đã đồng bộ" khi còn dữ liệu chưa lên server.
- **Auth:** chỉ sync khi đã đăng nhập; đăng ký sau khi auth resolve để token không rỗng.
- **Đổi tài khoản:** khi logout, thử `syncNow()` lần cuối rồi xoá `local_activity` + `sync_queue`
  (không đổi schema). Nếu offline lúc logout, dữ liệu chưa sync của user cũ bị mất — chấp nhận.

## Thiết kế

### Native (Kotlin)

- `SyncQueueDao`: `enqueue` đổi thành `@Upsert`-kiểu cập nhật (payload, state, attempts,
  next_attempt_at) thay cho IGNORE; thêm `getDue(entityType, nowMs, limit)`
  (`state='PENDING' AND next_attempt_at<=now`), `markSyncing(ids)`, `markSynced(ids, nowMs)`,
  `markFailed(id, attempts, nextAttemptAt, error)`, `deleteSynced(olderThanMs)`,
  `resetSyncing(nowMs)`, `countUnsynced()` (= `PENDING + SYNCING + FAILED`), `clearAll()`.
- `LocalActivityDao`: thêm `getPending(limit)`, `markSyncState(date, state)`, `clearAll()`.
- `SyncModule`: thay stub bằng primitive thật:
  `enqueue`, `getDue`, `markSyncing`, `markSynced`, `markFailed`, `getPendingCount`
  (đếm cả `FAILED`), `deleteSynced`, `resetSyncing`, `clearAll`. Bỏ
  `syncNow`/`registerHandler`/`getLastSyncAt` khỏi native (chuyển trách nhiệm sang JS); cập nhật
  `native-interface.d.ts`, `mockNative.Sync` tương ứng.
- `enqueue` ghi payload JSON + `clientUpdatedAtMs`; nếu `(entity_type, client_id)` đã có thì cập
  nhật và reset về `PENDING`.

### JS (`src/services/sync/`)

- `syncManager` (mở rộng file sẵn có):
  - `enqueueDailyActivity(row)` → clientId `"<date>|<timezoneId>"`, payload `DailyActivityUpsert`
    (`updatedAt` ISO UTC từ `updatedAtMs`).
  - `syncNow()`: chống chạy song song; bỏ qua khi offline/chưa đăng nhập; backfill local PENDING
    chưa có trong queue; lặp tối đa 10 lô: lấy due `DAILY_ACTIVITY` (≤31) → `markSyncing` → POST
    `/api/activities/sync` → map kết quả theo `clientId`:
    - `CREATED` / `DUPLICATE` → `markSynced` cả queue lẫn `local_activity`.
    - `CONFLICT` → `markSynced` (server thắng); ghi chú Ngày 9 sẽ ghi đè local từ `serverVersion`.
    - HTTP 400 → `FAILED`, không retry (lỗi dữ liệu). Lỗi mạng/5xx/401 → `markFailed` + backoff.
  - Backoff: `min(60s * 2^attempts, 30min) * random(0.5..1.5)`.
  - `resetSyncing()` + `deleteSynced(30 ngày)` lúc khởi tạo để item kẹt `SYNCING` do kill app quay
    lại `PENDING`.
  - Hẹn `setTimeout` tới `next_attempt_at` sớm nhất sau khi có item `FAILED`; clear khi offline,
    unmount hoặc khi chạy lại thành công.
  - Cập nhật `useSyncStatus` (pending/syncing/lastSyncAtMs/lastError) sau mỗi lần chạy.
  - `clearLocalData()`: gọi khi logout — `syncNow()` best-effort rồi `clearAll()` cả hai bảng.
- `src/app` (hoặc nơi auth đã resolve): đăng ký NetInfo listener + gọi `syncNow()` khi có mạng và
  lúc app start; cleanup khi unmount. Chỉ chạy khi `getAuth().currentUser` khác null.
- Logout (`AuthProvider`/hook đăng xuất): gọi `syncManager.clearLocalData()`.
- `DashboardScreen`: sau `LocalDb.upsertTodayActivity` gọi `enqueueDailyActivity(row)`; chip giữ
  nguyên UI (không bấm được), dữ liệu pending lấy từ store thật.
- Xoá `src/features/sync/index.ts` placeholder nếu không còn dùng.

### Test

- Jest cho phần thuần JS: payload mapping, enqueue lại cùng ngày cập nhật payload, chọn lô ≤31,
  backoff/jitter (fake timer/random), hẹn retry, mapping status → state, lỗi 400 không retry, lỗi
  mạng có retry, chip đếm cả `FAILED`, logout clear.
- Native DAO: không thêm instrumented test trong Ngày 8; kiểm bằng build + chạy máy thật.

### Kiểm chứng

- `npx jest`, `npx tsc --noEmit`.
- `./gradlew assembleDebug` (build native).
- Máy thật: offline → đi bộ → bật mạng → `daily_activities` có đúng 1 dòng; gọi sync lặp →
  `DUPLICATE`, không nhân đôi; chip chuyển "Đã đồng bộ" sau khi server xác nhận.

## Việc Ngày 9 sẽ thay

- Đổi endpoint sang `/api/sync/reconcile`, batch ≤500, dùng `serverVersion` khi `CONFLICT`.
- Chuyển sync sang native/WorkManager nếu cần chạy nền.
