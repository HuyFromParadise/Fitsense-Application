# Schema local (Room, SQLite) — hợp đồng với native

Tất cả bảng tạo từ ngày 1 trong `FitSenseDatabase` (version 1, `exportSchema = false`) để không ai phải sửa file nóng sau này.
Đổi cấu trúc: chủ feature tăng version, viết migration, báo người kia.

- Thời gian: epoch milliseconds (`INTEGER`).
- Ngày: chuỗi `yyyy-MM-dd` theo **giờ địa phương** của thiết bị.
- Khoảng cách: mét (`REAL`), giờ: UTC.

## local_activity — chủ: B (F5)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `activity_date` | TEXT (PK) | `yyyy-MM-dd`, giờ địa phương |
| `timezone_id` | TEXT | ví dụ `Asia/Ho_Chi_Minh`, gửi kèm khi sync |
| `steps` | INTEGER | bước trong ngày (đã trừ baseline) |
| `distance_m` | REAL | ước tính |
| `calories` | REAL | ước tính |
| `active_minutes` | INTEGER | |
| `updated_at` | INTEGER | epoch ms; dùng để so bản mới hơn khi conflict |
| `sync_state` | TEXT | `PENDING`/`SYNCING`/`SYNCED`/`FAILED` |

Nguồn của Zustand `useTodayActivity`. A (F3 Analytics) đọc bảng này khi offline.
JS đọc/ghi qua `NativeModules.LocalDbModule` (`LocalDbModule` trong `native-interface.d.ts`).

## local_exercise — chủ: A (F2)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT (PK) | UUID sinh lúc Start, cũng là `id` gửi server |
| `type` | TEXT | `WALKING`/`RUNNING`/`CYCLING` |
| `status` | TEXT | `ACTIVE`/`PAUSED`/`FINISHED`/`DISCARDED` |
| `started_at` | INTEGER | epoch ms |
| `ended_at` | INTEGER | nullable |
| `paused_total_ms` | INTEGER | |
| `distance_m` | REAL | |
| `duration_seconds` | INTEGER | không tính thời gian tạm dừng |
| `calories` | REAL | |
| `avg_pace_sec_per_km` | REAL | nullable |
| `point_count` | INTEGER | |
| `updated_at` | INTEGER | epoch ms |
| `sync_state` | TEXT | |

B (F7 Goals, F8 Sync) đọc để đếm số buổi tập, không ghi.

## local_gps_points — chủ: A (F2)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | INTEGER (PK, autoincrement) | |
| `session_id` | TEXT (FK → local_exercise.id, ON DELETE CASCADE) | index + unique cùng `seq` |
| `seq` | INTEGER | tăng dần trong session |
| `latitude` / `longitude` | REAL | |
| `altitude_m` | REAL | nullable |
| `speed_mps` | REAL | nullable |
| `accuracy_m` | REAL | nullable |
| `recorded_at` | INTEGER | epoch ms |
| `synced` | INTEGER (0/1) | đã gửi lên server hay chưa |

## sync_queue — chủ: B (F8)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | INTEGER (PK, autoincrement) | |
| `entity_type` | TEXT | `EXERCISE`/`DAILY_ACTIVITY` |
| `client_id` | TEXT | trùng id bản ghi gốc |
| `operation` | TEXT | `UPSERT` |
| `payload` | TEXT | JSON snapshot lúc xếp hàng |
| `state` | TEXT | `PENDING`/`SYNCING`/`SYNCED`/`FAILED` |
| `attempts` | INTEGER | dùng cho exponential backoff |
| `next_attempt_at` | INTEGER | epoch ms |
| `last_error` | TEXT | nullable |
| `created_at` / `updated_at` | INTEGER | |

Unique index `(entity_type, client_id)` — cùng một bản ghi không xếp hàng hai lần.

## step_snapshots — chủ: B (F5)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `date` | TEXT (PK) | `yyyy-MM-dd` |
| `timezone_id` | TEXT | |
| `baseline_counter` | INTEGER | counter sensor lúc 00:00 |
| `last_counter` | INTEGER | counter gần nhất |
| `steps` | INTEGER | |
| `boot_count` | INTEGER | phát hiện reboot |
| `updated_at` | INTEGER | |

Dùng để chốt ngày hôm trước khi người dùng không mở app, restart app không đếm trùng, reboot không mất bước trước đó.

## sensor_samples — chủ: B (F6)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | INTEGER (PK, autoincrement) | |
| `type` | TEXT | `ACCELEROMETER`/`GYROSCOPE` |
| `x` / `y` / `z` | REAL | |
| `magnitude` | REAL | |
| `label` | TEXT | nhãn phân loại tại thời điểm mẫu |
| `recorded_at` | INTEGER | epoch ms, có index |

Chỉ ghi khi bật chế độ thu mẫu (tùy chọn, để chỉnh ngưỡng).
