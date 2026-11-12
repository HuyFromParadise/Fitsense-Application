# 📋 KẾ HOẠCH HOÀN THIỆN CHI TIẾT — DEVELOPER B

> **Dự án:** FitSense Application
> **Người thực hiện:** Developer B
> **Phạm vi quản lý:** Features F5, F6, F7, F8, F9 + Mobile skeleton, Room, native bridge
> **Tài liệu căn cứ:** `OWNERSHIP.md`, `01_PROJECT_OVERVIEW_AND_OWNERSHIP.md`, `02_DAY1_SHARED_FOUNDATION.md`, `03_SHARED_CONTRACTS_AND_HOTSPOTS.md`, `04_OFFLINE_SYNC_DESIGN.md`, `05_IMPLEMENTATION_ROADMAP.md`, `room-schema.md`, `native-interface.d.ts`, `openapi.yaml`, `DEV_A_IMPLEMENTATION_PLAN.md`

---

## 1. TỔNG QUAN PHẠM VI & QUYỀN SỞ HỮU CỦA DEVELOPER B

### 1.1 Danh mục Feature phụ trách

| STT | Mã | Tên Feature | Backend (`com.example.fitsense.*`) | Mobile (`src/features/*`) | Native Kotlin (`com.fitsensemobile.*`) |
|:---:|:---:|---|---|---|---|
| 1 | **F5** | **Steps + Dashboard** | `activity` | `steps-dashboard` | `steps`, `database` |
| 2 | **F6** | **Sensor Monitor** | — | `sensors` | `sensors` |
| 3 | **F7** | **Goals** | `goal` | `goals` | — |
| 4 | **F8** | **Offline Sync** | `sync` | `sync`, `src/services/sync` | `sync` |
| 5 | **F9** | **Local notification + tối ưu pin** | — | `notifications` | `notification` |

### 1.2 File "Nóng" & Hợp đồng dữ liệu do B làm chủ

**File B là người duy nhất được sửa:**

- `FitSenseMobile/android/app/src/main/AndroidManifest.xml` — quyền, service, receiver đã khai báo đủ ngày 1.
- `FitSenseMobile/android/app/src/main/java/com/fitsensemobile/FitSensePackage.kt` — đăng ký đủ module.
- `FitSenseMobile/android/app/src/main/java/com/fitsensemobile/database/*` — `FitSenseDatabase`, 6 entity, 6 DAO (Room version 1).
- `FitSenseMobile/src/app/navigation/*` — route đã khai báo sẵn; feature khác chỉ thay nội dung màn hình.
- `FitSenseMobile/src/stores/useTodayActivity.ts`, `useSyncStatus.ts` — giao diện dữ liệu dùng chung.
- `src/services/sync/*` — lõi điều phối đồng bộ phía JS.

**Dữ liệu B cung cấp cho A:**

- `useTodayActivity` (Zustand) + bảng Room `local_activity`: steps, distanceM, calories, activeMinutes — A dùng cho Analytics (F3).
- `useGoals()` + `GET/POST/PUT/DELETE /api/goals`: A dùng tính tỷ lệ hoàn thành goal trong Analytics.
- `SyncManager` + interface `SyncHandler`: A cắm `ExerciseSyncHandler` (Kotlin) và `ExerciseSyncProcessor` (Spring) vào.
- `POST /api/sync/reconcile`: entrypoint đồng bộ chung; A chỉ viết processor cho `EXERCISE`.

**Dữ liệu B cần từ A:**

- `useProfile()` (chiều cao, cân nặng) — tính stride/calories ở Dashboard; fallback mặc định nếu chưa có.
- Bảng Room `local_exercise` (chỉ đọc) — đếm số buổi tập/tuần cho Goal `WEEKLY_EXERCISE_COUNT`.
- `src/services/api/client.ts` + token — mọi call API của B dùng chung, không tự tạo axios instance.
- `SecurityConfig.java` — B không sửa; route B đã nằm trong nhóm authenticated mặc định.
- Firestore Admin SDK config — ghi mirror `users/{uid}/goals/{goalId}` (nếu làm).

---

## 2. TRẠNG THÁI HIỆN TẠI (ĐÃ LÀM VS CÒN LẠI)

### 2.1 Đã hoàn thành (Day 1 Mobile Skeleton) ✅

- [x] Cấu trúc thư mục feature-based đầy đủ (`src/app`, `src/features/*`, `src/services/*`, `src/components`, `src/stores`, `src/theme`, `src/utils`).
- [x] Navigation đủ route: Auth stack + Main tabs (Dashboard, Exercise, Analytics, Goals, Profile) + Sensor Monitor, kèm `types.ts`.
- [x] Axios client `src/services/api/client.ts` (gắn Bearer token, chuẩn hóa lỗi) + `services/api/errors.ts`, `types.ts`, `config.ts`.
- [x] Theme + bộ component dùng chung: `Button`, `Input`, `Card`, `Loading`, `ErrorState`, `EmptyState`.
- [x] Zustand store khung: `useAuthStore`, `useTodayActivity` (đọc `LocalDb.getTodayActivity`), `useSyncStatus`.
- [x] Native Kotlin: `FitSensePackage` đăng ký đủ 6 module; `LocalDbModule` đọc/ghi `local_activity` thật, đọc `local_exercise`/`local_gps_points`; `StepCounterModule`, `MotionSensorModule`, `SyncModule` stub; `NotificationModule` tạo channel + `show()` cơ bản.
- [x] Room `FitSenseDatabase` version 1 đủ 6 bảng + DAO khung (`LocalActivityDao`, `LocalExerciseDao`, `LocalGpsPointDao`, `SyncQueueDao`, `StepSnapshotDao`, `SensorSampleDao`).
- [x] `AndroidManifest.xml` khai báo đủ quyền `ACTIVITY_RECOGNITION`, location, foreground service, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`; `BootReceiver` stub.
- [x] Wrapper TS `src/services/native/index.ts` + `mock.ts` (iOS/test dùng mock).
- [x] Màn hình placeholder: `DashboardScreen` (health + đọc local_activity), `GoalsScreen`, `SensorMonitorScreen` (đọc stub).

### 2.2 Chưa làm — phần còn lại của B ❌

Danh sách dưới là **toàn bộ phần còn thiếu**, đối chiếu với code hiện tại. Đánh `[x]` khi xong; mỗi mục gắn với ngày tương ứng ở mục 3.

**F5 — Steps + Dashboard (Ngày 2–4, 7, 10)**

- [ ] Native `steps/StepCounterModule.kt`: thay stub bằng step counter thật (`getStatus`, `requestPermission`, `start`, `stop`, `getTodaySteps`, `getHistory`, emit `STEP_UPDATE`).
- [ ] Native `steps/StepBaselineCalculator.kt`: baseline theo ngày, reboot, counter reset, bỏ qua nhiều ngày + unit test.
- [ ] Native `steps/StepSnapshotWorker.kt`: WorkManager periodic ~15 phút, đăng ký unique work.
- [ ] Native `notification/BootReceiver.kt`: thay no-op → chốt snapshot + enqueue worker sau reboot.
- [ ] Native `database/StepSnapshotDao.kt`: thêm `getRange(fromDate, toDate)` (hiện chỉ có `getByDate`/`upsert`).
- [ ] Mobile `useStepCounter.ts`: start/stop theo mount, subscribe `STEP_UPDATE`, trả status/permission.
- [ ] Mobile `dashboardMetrics.ts`: stride, distance, calories, active minutes + fallback profile; kèm test nhỏ.
- [ ] Mobile `DashboardScreen.tsx`: thay placeholder bằng số liệu thật, goal ring, trạng thái bài tập, quick-start, sync chip.
- [ ] Mobile: ghi `local_activity` (`syncState: 'PENDING'`) qua `LocalDb.upsertTodayActivity` sau mỗi lần tính.
- [ ] Backend `activity`: thay `ActivityPlaceholderController` bằng `DailyActivityEntity`, `DailyActivityRepository`, `DailyActivityService`, `ActivityController`; `GET /api/activities/daily` + `/history`, lọc `user_id`; `ActivityServiceTest`.

**F6 — Sensor Monitor (Ngày 6–7)**

- [ ] Native `sensors/MotionSensorModule.kt`: thay stub bằng accelerometer + gyroscope (`SENSOR_DELAY_UI`, clamp ≥50ms, emit `MOTION_SAMPLE` / `MOTION_LABEL_CHANGED`, stop khi background).
- [ ] Native `sensors/MovementClassifier.kt` + `sensors/SensorConfig.kt`: cửa sổ trượt ~2s, ngưỡng STILL/WALKING/RUNNING, chống nhấp nháy + unit test.
- [ ] Native (tùy chọn) ghi `sensor_samples` khi bật sampling mode (mặc định tắt).
- [ ] Mobile `useMotionSensor.ts`: start/stop, buffer ~50 mẫu, throttle render.
- [ ] Mobile `SensorMonitorScreen.tsx`: thay placeholder bằng X/Y/Z realtime, steps, nhãn + confidence, LineChart, trạng thái `UNAVAILABLE`/`PERMISSION_DENIED`.

**F7 — Goals (Ngày 5, 7)**

- [ ] Backend `goal`: thay `GoalPlaceholderController` bằng `GoalEntity` (bảng `goals` V2 đã có sẵn), `GoalRepository`, `GoalService`, `GoalController`; CRUD + validate + ownership 403/404; `GoalServiceTest`.
- [ ] Backend (tùy chọn) mirror Firestore `users/{uid}/goals/{goalId}`; nếu bỏ qua thì ghi rõ trong tài liệu.
- [ ] Mobile `goalsApi.ts`: list/create/update/delete qua `src/services/api/client.ts`.
- [ ] Mobile `useGoals.ts`: TanStack Query + invalidate sau mutation.
- [ ] Mobile `GoalsScreen.tsx`: thay placeholder bằng danh sách + progress bar + form tạo/sửa + xóa xác nhận + empty/error/loading.
- [ ] Mobile: progress daily từ `useTodayActivity`; weekly từ `local_exercise` (chỉ đọc qua `LocalDb.getLocalExercises`, lặp trang nếu thiếu tuần; `LocalExerciseDao.countBetween` có sẵn nhưng chưa expose — nếu muốn thêm method vào `LocalDbModule` thì phải sửa `native-interface.d.ts` + báo A).
- [ ] Mobile (tùy chọn): màn lịch sử goal đã đạt, derive từ `/api/activities/history` + goal hiện tại.

**F8 — Offline Sync (Ngày 8–10, 12)**

- [ ] Native `database/dao/SyncQueueDao.kt`: thêm `getDue`, `markSyncing`, `markSynced`, `markFailed`, `deleteSynced`, `resetForRetry` (hiện có `enqueue`/`getPending`/`countPending`/`updateState`).
- [ ] Native `sync/SyncHandler.kt`: mở rộng interface đúng `native-interface.d.ts` (`collectPending`, `buildRequest`, `onResult`).
- [ ] Native `sync/SyncManager.kt` (mới): registry handler, batch ≤500, POST `/api/sync/reconcile` bằng OkHttp, backoff + jitter, network callback, emit `SYNC_STATUS`.
- [ ] Native `sync/SyncModule.kt`: thay stub 5 method (`enqueue`, `getPendingCount`, `syncNow`, `registerHandler`, `getLastSyncAt`).
- [ ] Native `sync/DailyActivitySyncHandler.kt`: payload `DailyActivityUpsert`, `onResult` cập nhật `local_activity.sync_state`, CONFLICT theo `serverVersion`.
- [ ] Native: cấu hình base URL + token (Firebase ID token; dev-token chỉ ở debug).
- [ ] Backend `sync`: thay `SyncPlaceholderController` bằng `SyncController`, `SyncProcessor` + registry, `DailyActivitySyncProcessor`, cập nhật `user_devices.last_sync_at`; `SyncServiceTest`.
- [ ] Backend: test lô trộn `EXERCISE` + `DAILY_ACTIVITY` cùng processor của A.
- [ ] Mobile `src/services/sync/index.ts`: NetInfo → `Sync.syncNow()`, subscribe `SYNC_STATUS`, `enqueueDailyActivity`.
- [ ] Mobile `src/features/sync/index.ts` + Dashboard: chip trạng thái, nút "Thử lại" khi `FAILED`.

**F9 — Local notification + tối ưu pin (Ngày 11)**

- [ ] Native `notification/NotificationModule.kt`: thay stub `scheduleDailyReminders`/`cancelDailyReminders` bằng WorkManager thật; `ensureReady`/`show`/`cancel` đã có.
- [ ] Native `notification/DailyReminderWorker.kt` (mới): nhắc đạt bước + nhắc ít vận động theo khung giờ, chống gửi lặp.
- [ ] Native `notification/BootReceiver.kt`: re-schedule reminder work sau reboot (cùng chỗ sửa với F5).
- [ ] Mobile `NotificationSettingsScreen.tsx` (mới, thêm route trong `navigation/types.ts`): toggle + khung giờ + gọi module.
- [ ] Mobile `src/features/notifications/index.ts`: lắng nghe `EXERCISE_STATE` `FINISHED` → `Notification.show`.
- [ ] Đo pin 30 phút tracking + ghi tài liệu; đề xuất thay đổi GPS cho A (không tự sửa file location).

**Test & tài liệu (Ngày 12–13)**

- [ ] Backend JUnit: `ActivityServiceTest`, `GoalServiceTest`, `SyncServiceTest` (+ MockMvc 401/403 nếu A chưa phủ).
- [ ] Kotlin unit: `StepBaselineCalculatorTest`, `MovementClassifierTest`, `SyncBackoffTest`, `DailyActivitySyncHandlerTest`.
- [ ] RNTL: Goals CRUD/validate, Dashboard số liệu + fallback, Sync chip.
- [ ] Test tay + test chéo: reboot, sensor unavailable, mất mạng giữa sync, AC-13/AC-14.
- [ ] Tài liệu Ngày 13 (`MOBILE_ARCHITECTURE`, `NATIVE_ANDROID_FEATURES`, `OFFLINE_SYNC`, `DATABASE_DESIGN`, `TESTING`) + cập nhật `openapi.yaml` phần Activity/Goal/Sync.

### 2.3 Ghi chú kỹ thuật quan trọng

- `daily_activities` (V1) dùng cột `client_updated_at` để so bản mới hơn khi reconcile.
- `user_devices.last_sync_at` đã có sẵn; `fcm_token` nullable nên B có thể upsert device row mà không đụng F4.
- `SyncQueueEntity` đã có unique index `(entity_type, client_id)` (đã xác nhận trong code) — không cần sửa schema khi viết `SyncManager`.
- `native-interface.d.ts` là **bản chính**; đổi method/payload phải sửa file đó trước, commit riêng, báo A.
- Giờ địa phương cho ngày (`yyyy-MM-dd`), epoch ms cho thời gian; gửi kèm `timezoneId` khi sync.

---

## 3. LỘ TRÌNH TRIỂN KHAI CHI TIẾT THEO NGÀY

```
                TUẦN 1
  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
  │  NGÀY 2   │    │  NGÀY 3   │    │  NGÀY 4   │    │  NGÀY 5   │    │  NGÀY 6   │    │  NGÀY 7   │
  │F5: Steps  │───>│F5: Base-  │───>│F5: Dash-  │───>│  F7: Goals│───>│  F6: Sensors│──>│ Buffer &  │
  │  (native) │    │  line     │    │  board    │    │ (full-stack)│  │ (native+UI)│   │ Integration│
  └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘
                                         TUẦN 2
  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
  │  NGÀY 8   │    │  NGÀY 9   │    │  NGÀY 10  │    │  NGÀY 11  │    │  NGÀY 12  │    │NGÀY 13-14 │
  │F8: Core   │───>│F8: Server │───>│F8: Polish │───>│F9: Notify │───>│  Testing  │───>│ Freeze &  │
  │  client   │    │ + handler │    │  & E2E    │    │  & Power  │    │& Cross-test│  │   Demo    │
  └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘
```

---

### NGÀY 2: [F5] STEPS — NATIVE STEP COUNTER

#### Android Native (`com.fitsensemobile.steps`)

- [ ] `StepCounterModule` thật (thay stub):
  - `getStatus()`: `SensorManager.getDefaultSensor(TYPE_STEP_COUNTER)` null → `UNAVAILABLE`; chưa có quyền `ACTIVITY_RECOGNITION` (API 29+) → `PERMISSION_DENIED`; còn lại `AVAILABLE`.
  - `requestPermission()`: dùng `PermissionHelper`, trả `GRANTED` / `DENIED` / `PERMANENTLY_DENIED` / `NOT_DETERMINED` đúng `native-interface.d.ts`.
  - `start()`: đăng ký `SensorEventListener`, gọi lại khi đang chạy là no-op; emit event `STEP_UPDATE` qua `EventEmitterHelper`.
  - `stop()`: unregister listener, dừng emit.
  - `getTodaySteps()`: trả `StepCounterSnapshot` đúng field: `stepsToday`, `stepsSinceBoot`, `baselineCounter`, `date`, `bootCount`, `status`, `updatedAtMs`.
  - `getHistory(fromDate, toDate)`: đọc `step_snapshots` trong khoảng.
- [ ] Ghi/đọc `step_snapshots` qua `StepSnapshotDao` (đã có DAO khung).
- [ ] Listener theo lifecycle: đăng ký khi `start()`, tự `stop()` khi app vào background nếu không cần foreground (dùng `LifecycleEventListener` hoặc `AppState` phía JS — chọn một, ghi comment).

#### Mobile (`src/features/steps-dashboard`)

- [ ] Hook `useStepCounter`:
  - Gọi `StepCounter.start()` khi mount, `stop()` khi unmount.
  - Subscribe `addNativeListener('STEP_UPDATE', ...)`, cập nhật state.
  - Trả `{ snapshot, status, permission, requestPermission, isListening }`.
- [ ] Dashboard tạm (trong ngày 2): hiển thị số bước thô + trạng thái quyền + nút xin quyền, dùng component chung.

#### Room / Contract

- [ ] Không đổi schema. Nếu buộc phải thêm cột → tăng version + migration, viết vào `native-interface.d.ts` nếu lộ ra JS, báo A.

#### Tiêu chí nghiệm thu ngày 2

- Mở app trên máy thật, xin quyền `ACTIVITY_RECOGNITION`, đi bộ và thấy số bước tăng realtime trong app.
- Từ chối quyền → UI hiện `PERMISSION_DENIED` + nút mở Settings, không crash.

---

### NGÀY 3: [F5] STEPS — BASELINE, REBOOT, WORKER

#### Android Native (`com.fitsensemobile.steps`)

- [ ] Tách logic thuần Kotlin `StepBaselineCalculator` (không phụ thuộc Android) để test được:
  - `stepsToday = counter hiện tại − baselineCounter` (counter là bộ đếm since boot của sensor).
  - Rollover ngày: khi `date` đổi (giờ địa phương), chốt snapshot ngày cũ, đặt `baselineCounter = counter hiện tại`, `steps = 0`.
  - Reboot: `bootCount = Settings.Global.BOOT_COUNT`; nếu `bootCount` đổi **hoặc** `counter < last_counter` → counter đã reset: giữ `steps` trước reboot, đặt `baselineCounter = counter` (counter mới), không đếm lùi.
  - Bỏ qua nhiều ngày không mở app: chốt các ngày thiếu bằng snapshot cuối, không nhân đôi steps.
  - Counter reset giữa ngày (không reboot): xử lý như reboot (giữ steps đã có, baseline mới).
- [ ] `StepSnapshotWorker` (WorkManager, periodic ~15 phút): đọc counter hiện tại → tính → upsert `step_snapshots` + `local_activity` (sync_state `PENDING`).
- [ ] `BootReceiver`: nhận `BOOT_COMPLETED` → enqueue one-time `StepSnapshotWorker` để chốt dữ liệu trước reboot.
- [ ] Đảm bảo `StepSnapshotWorker` không đăng ký trùng (unique work name).

#### Mobile

- [ ] Dashboard hiển thị số bước hôm nay giữ nguyên sau khi kill app, restart, reboot.
- [ ] Không đếm trùng khi mở app nhiều lần trong ngày.

#### Test (bắt buộc)

- [ ] Unit test thuần Kotlin cho `StepBaselineCalculator`: reboot, qua ngày, bỏ qua nhiều ngày, counter reset giữa ngày, counter không đổi.

#### Tiêu chí nghiệm thu ngày 3

- Kill app → mở lại: số bước không mất, không tăng ảo.
- Reboot máy → số bước trước reboot vẫn còn, tiếp tục đếm đúng.
- Unit test pass bằng `gradlew test` (hoặc ít nhất module JVM test chạy được).

---

### NGÀY 4: [F5] DASHBOARD — DISTANCE, CALORIES, BACKEND ACTIVITY

#### Mobile (`src/features/steps-dashboard`)

- [ ] `dashboardMetrics.ts` (hàm thuần, có test nhỏ):
  - `strideM = heightCm * 0.415` (ước tính đi bộ; ghi rõ là ước tính trong UI/tài liệu).
  - `distanceM = steps * strideM`.
  - `calories ≈ steps * weightKg * 0.0005` (ước tính; hằng số để một chỗ, dễ chỉnh).
  - `activeMinutes = round(steps / 100)` hoặc suy từ timestamp các snapshot (chọn một, ghi comment).
  - Fallback khi chưa có profile: `heightCm = 170`, `weightKg = 70`; hiển thị nhãn "ước tính".
- [ ] Dùng `useProfile()` của A (không đọc Firestore trực tiếp, không tạo hook riêng).
- [ ] Lưu `local_activity` qua `LocalDb.upsertTodayActivity` với `updatedAtMs`, `syncState: 'PENDING'`.
- [ ] `useTodayActivity.refresh()` sau mỗi lần tính lại; store giữ nguyên shape hiện tại (A đang dùng).
- [ ] Dashboard UI:
  - Steps + goal ring (progress = steps / goal; goal lấy từ `useGoals()` nếu có, fallback 8000 bước).
  - Distance (km), calories (kcal), active minutes.
  - Trạng thái bài tập (`Exercise.getStatus()` — chỉ đọc) + nút quick-start điều hướng sang tab Exercise.
  - Sync chip nhỏ dùng `useSyncStatus` (số bản ghi chờ) — có thể để ngày 8 hoàn thiện.

#### Backend (`com.example.fitsense.activity`)

- [ ] Thay `ActivityPlaceholderController` bằng `ActivityController` + `ActivityService` + `DailyActivityRepository` + `DailyActivityEntity`:
  - `GET /api/activities/daily?date&timezoneId`: mặc định hôm nay; trả `ApiResponse<DailyActivity>`; user không có dữ liệu → trả object 0 hoặc 404 theo thống nhất với A (khuyến nghị trả 200 với số 0 để Dashboard đơn giản).
  - `GET /api/activities/history?page&size&from&to`: trả `PageResponse<DailyActivity>`; mặc định sắp xếp `activity_date DESC`.
  - Mọi query phải lọc `user_id` của `CurrentUser` (AC-13).
  - Map `client_updated_at` → `updatedAt` trong response.
- [ ] `DailyActivityEntity` map đúng bảng V1, không sửa migration.
- [ ] Unit test `ActivityServiceTest`: lấy daily, lịch sử phân trang, user không thấy dữ liệu người khác, không có dữ liệu.

#### Tiêu chí nghiệm thu ngày 4

- Dashboard hiển thị steps/distance/calories/active minutes từ dữ liệu thật trên máy.
- `GET /api/activities/daily` trả đúng dữ liệu (dùng `dev-token` khi test nhanh).
- Đổi profile chiều cao/cân nặng → Dashboard cập nhật số liệu ước tính.

---

### NGÀY 5: [F7] GOALS — BACKEND CRUD + MOBILE

#### Backend (`com.example.fitsense.goal`)

- [ ] Thay `GoalPlaceholderController` bằng đầy đủ:
  - `GoalEntity` map bảng `goals` (V2): `id` UUID, `user_id`, `goal_type`, `target_value`, `starts_on`, `ends_on`, `enabled`, `created_at`, `updated_at`.
  - `GoalRepository`, `GoalService`, `GoalController`.
  - `POST /api/goals` → 201 + `ApiResponse<Goal>`; `GET /api/goals` (enabled, mặc định active hôm nay); `PUT /api/goals/{id}`; `DELETE /api/goals/{id}` → 204.
  - Validate `targetValue > 0`, `endsOn >= startsOn`, enum khớp `GoalType` trong `openapi.yaml` (`DAILY_STEPS`, `DAILY_DISTANCE`, `DAILY_CALORIES`, `WEEKLY_EXERCISE_DURATION`, `WEEKLY_EXERCISE_COUNT`).
  - Kiểm tra quyền sở hữu: goal của user khác → 403; không tồn tại → 404.
- [ ] (Tùy chọn, nếu kịp) Mirror Firestore `users/{uid}/goals/{goalId}` bằng Admin SDK; nếu không kịp thì ghi rõ trong tài liệu là chỉ MySQL (demo vẫn đạt AC-08).
- [ ] Unit test `GoalServiceTest`: CRUD, validate, người khác sửa/xóa bị 403, tạo goal trùng không nhân đôi (nếu unique theo type+period — nếu không có unique thì không chặn).

#### Mobile (`src/features/goals`)

- [ ] `goalsApi.ts`: `listGoals`, `createGoal`, `updateGoal`, `deleteGoal` dùng `src/services/api/client.ts`.
- [ ] `useGoals.ts` (TanStack Query): query list, mutation create/update/delete, invalidate sau mutation.
- [ ] `GoalsScreen`:
  - Danh sách goal + progress bar.
  - Progress nguồn:
    - `DAILY_STEPS` / `DAILY_DISTANCE` / `DAILY_CALORIES` → `useTodayActivity`.
    - `WEEKLY_EXERCISE_COUNT` / `WEEKLY_EXERCISE_DURATION` → đọc `local_exercise` (chỉ đọc) qua `LocalDb.getLocalExercises`, lọc các buổi `FINISHED` trong tuần; nếu phân trang chưa đủ tuần thì tăng limit hoặc lặp trang (không thêm method native nếu chưa báo A).
  - Form tạo/sửa (dùng form + Zod đã cài), xóa có xác nhận.
  - Màn "Lịch sử goal đã đạt": derive từ `GET /api/activities/history` + goal hiện tại (tối giản, không cần bảng mới).
- [ ] Empty/Error/Loading state dùng component chung.

#### Tiêu chí nghiệm thu ngày 5

- Tạo goal bước chân → progress thay đổi theo số bước thật.
- Tài khoản khác không sửa/xóa được goal (403).
- CRUD chạy trên máy thật, dữ liệu sống sau khi restart app.

---

### NGÀY 6: [F6] SENSORS — NATIVE + UI

#### Android Native (`com.fitsensemobile.sensors`)

- [ ] `MotionSensorModule` thật:
  - `start(sensors)`: `accelerometer` / `gyroscope` / `both`; dùng `SENSOR_DELAY_UI`.
  - `stop()`: unregister toàn bộ listener.
  - `getSnapshot()`: status, label, confidence, lastSample, updatedAtMs.
  - `setEmitInterval(ms)`: kẹp tối thiểu ~50ms (tối đa 20 Hz), mặc định ~100ms.
  - Emit `MOTION_SAMPLE` (x, y, z, magnitude, timestampMs) và `MOTION_LABEL_CHANGED` (label, confidence, timestampMs).
  - Hủy listener khi app ra background (`LifecycleEventListener` / `onHostPause`).
- [ ] `MovementClassifier` (thuần Kotlin, test được):
  - Cửa sổ trượt ~2 giây trên `magnitude` của accelerometer.
  - Tính độ lệch chuẩn; ngưỡng đặt trong `SensorConfig.kt`: `STILL_MAX_STD`, `WALKING_MAX_STD`, `RUNNING_MIN_STD`.
  - Nhãn `STILL` / `WALKING` / `RUNNING` / `UNKNOWN`; confidence = hàm đơn giản từ khoảng cách tới ngưỡng (0..1).
  - Chống nhấp nháy: chỉ đổi nhãn sau N cửa sổ liên tiếp hoặc dùng hysteresis.
- [ ] (Tùy chọn) Ghi `sensor_samples` khi bật sampling mode; mặc định tắt.

#### Mobile (`src/features/sensors`)

- [ ] `useMotionSensor` hook: start/stop theo mount, subscribe 2 event, giữ buffer ~50 mẫu.
- [ ] `SensorMonitorScreen`:
  - X/Y/Z realtime (cập nhật ~10 Hz, tránh re-render quá nhiều — dùng state gộp hoặc throttle).
  - Số bước hiện tại (từ `useStepCounter`).
  - Nhãn chuyển động + confidence.
  - Biểu đồ nhỏ (`react-native-gifted-charts` LineChart) trên buffer mẫu.
  - Trạng thái `UNAVAILABLE` / `PERMISSION_DENIED` rõ ràng (máy không có sensor).

#### Test

- [ ] Unit test `MovementClassifier`: chuỗi mẫu STILL/WALKING/RUNNING, nhiễu ngưỡng, cửa sổ chưa đủ mẫu.

#### Tiêu chí nghiệm thu ngày 6

- Đứng yên → `STILL`; đi bộ → `WALKING`; chạy → `RUNNING` trên máy thật.
- Ra background → không còn emit (kiểm tra log), vào lại → hoạt động lại.
- Máy không có gyroscope → UI báo `UNAVAILABLE`, không crash.

---

### NGÀY 7: TÍCH HỢP & BUFFER (NHẸ)

- [ ] `POST /api/activities/sync` bản đầu (chuẩn bị F8): nhận `items` (max 31), upsert theo `(user_id, activity_date)`, conflict last-write-wins theo `client_updated_at`; trả `SyncItemResult[]` với `CREATED` / `DUPLICATE` / `CONFLICT`; validate `activityDate` + `timezoneId` + số âm.
- [ ] Sửa lỗi tồn của Steps và Goals phát hiện trong tuần.
- [ ] Goal `WEEKLY_EXERCISE_COUNT` dùng `local_exercise` của A (chỉ đọc, không ghi).
- [ ] Tinh chỉnh ngưỡng phân loại trên máy thật (ghi lại ngưỡng đã chọn vào `SensorConfig.kt`).
- [ ] Demo nội bộ, rà `BUGS.md`, hỗ trợ A nếu A còn nợ.
- [ ] **Tiêu chí nghiệm thu:** Dashboard + Goals + Sensor Monitor chạy ổn trên máy thật; `POST /api/activities/sync` gọi trùng không tạo bản thứ hai.

---

### NGÀY 8: [F8] OFFLINE SYNC — LÕI CLIENT

#### Android Native (`com.fitsensemobile.sync`)

- [ ] Mở rộng `SyncQueueDao` (không đổi schema nếu index đã đủ):
  - `getDue(nowMs, limit)`: `state = 'PENDING' AND next_attempt_at <= now`.
  - `markSyncing(ids)`, `markSynced(ids)`, `markFailed(id, attempts, nextAttemptAt, error)`.
  - `deleteSynced(olderThanMs)` (dọn queue đã sync).
  - `countPending()` (đã có).
  - Xác nhận unique index `(entity_type, client_id)` trong `SyncQueueEntity`; nếu thiếu → thêm index, tăng Room version + migration, báo A.
- [ ] `SyncHandler` interface (Kotlin) mở rộng đúng `native-interface.d.ts`:
  ```kotlin
  interface SyncHandler {
      val entityType: String
      suspend fun collectPending(limit: Int): List<SyncItem>
      suspend fun buildRequest(item: SyncItem): Map<String, Any?>
      suspend fun onResult(item: SyncItem, result: SyncResult)
  }
  ```
- [ ] `SyncManager` (singleton Kotlin):
  - Registry handler theo `entityType`.
  - `processQueue()`: lấy item due → build batch (≤500) → POST `/api/sync/reconcile` bằng OkHttp → xử lý từng `SyncItemResult`:
    - `CREATED` / `DUPLICATE` → `SYNCED`.
    - `CONFLICT` → `onResult` (handler quyết định giữ server hay local), không retry vô hạn.
    - `REJECTED` → `FAILED`, **không retry** (lỗi dữ liệu).
  - Retry: exponential backoff + jitter: `delay = min(60s * 2^attempts, 30min) * random(0.5..1.5)`, ghi `next_attempt_at`.
  - Chỉ chuyển `SYNCED` sau khi server xác nhận; không xóa local trước đó.
  - Phát hiện mạng bằng `ConnectivityManager` (`NetworkCallback`) + `syncNow()` thủ công.
  - Phát event `SYNC_STATUS` (pending, syncing, lastSyncAtMs, lastError).
- [ ] `SyncModule` thật: `enqueue`, `getPendingCount`, `syncNow`, `registerHandler`, `getLastSyncAt` đúng `.d.ts`.
- [ ] Token: lấy Firebase ID token bằng `FirebaseAuth.getInstance().currentUser?.getIdToken(...)`; base URL đọc từ config/build config (khớp `adb reverse tcp:8080 tcp:8080`). Nếu dev mode không Firebase → dùng `dev-token` qua cấu hình debug, **không hard-code production**.

#### Mobile (`src/services/sync` + `src/features/sync`)

- [ ] `src/services/sync/index.ts`:
  - Lắng nghe NetInfo: có mạng → `Sync.syncNow()`.
  - Subscribe `SYNC_STATUS` → cập nhật `useSyncStatus`.
  - Hàm `enqueueDailyActivity(row)` gọi `Sync.enqueue('DAILY_ACTIVITY', clientId, payload)`.
- [ ] `useSyncStatus` giữ shape hiện tại; chip trạng thái ở Dashboard.
- [ ] Handler giả để test: `FakeSyncHandler` (debug only) hoặc test Kotlin với processor giả.

#### Tiêu chí nghiệm thu ngày 8

- Queue ghi được bản ghi `DAILY_ACTIVITY`; tắt mạng → item nằm `PENDING`; bật mạng → `SYNCING` → `SYNCED` sau khi server xác nhận.
- Kill app giữa lúc sync → mở lại không mất item, không nhân đôi.
- Không có request nào khi offline; backoff tăng dần, có jitter.

---

### NGÀY 9: [F8] SYNC — SERVER + DAILY ACTIVITY HANDLER

#### Backend (`com.example.fitsense.sync`)

- [ ] Thay `SyncPlaceholderController`:
  - `SyncController` `POST /api/sync/reconcile` nhận `SyncReconcileRequest` (`deviceId`, `items` ≤500).
  - `SyncProcessor` interface: `entityType`, `process(item, userId): SyncItemResult`.
  - Registry processor theo `entityType` (Spring inject `List<SyncProcessor>`).
  - Mỗi item xử lý độc lập; **không** rollback cả lô khi một item lỗi.
  - Cập nhật `user_devices.last_sync_at` theo `(user_id, device_id)`; nếu chưa có row thì insert (`platform = 'android'`, `fcm_token = null`) hoặc bỏ qua — chọn một và ghi comment.
  - Response `SyncReconcileResponse` gồm `results` + `serverTime`.
  - Validate payload theo schema; validate `activityDate` không ở tương lai quá 1 ngày (tùy chọn), số không âm.
- [ ] `DailyActivitySyncProcessor`:
  - `clientId = "<activityDate>|<timezoneId>"` (đúng ghi chú trong `openapi.yaml`).
  - Upsert `daily_activities` theo `(user_id, activity_date)`; conflict: `client_updated_at` mới hơn thắng (bản client cũ hơn → `CONFLICT` + `serverVersion`).
  - Trả `CREATED` / `DUPLICATE` / `CONFLICT` / `REJECTED`.
- [ ] (Phối hợp A) `ExerciseSyncProcessor` do A viết; B chỉ đảm bảo registry gọi đúng interface và test lô trộn `EXERCISE` + `DAILY_ACTIVITY`.
- [ ] Test `SyncServiceTest`: gọi trùng nhiều lần (idempotent), lô bị ngắt giữa chừng (item lỗi không ảnh hưởng item khác), REJECTED, CONFLICT, cập nhật `last_sync_at`.

#### Android

- [ ] `DailyActivitySyncHandler`:
  - `collectPending`: đọc `local_activity` + `sync_queue` state PENDING.
  - `buildRequest`: payload `DailyActivityUpsert` (activityDate, timezoneId, steps, distanceM, calories, activeMinutes, updatedAt ISO-8601 UTC).
  - `onResult`: `SYNCED` → cập nhật `local_activity.sync_state`; `CONFLICT` → ghi đè local bằng `serverVersion` (daily summary server thắng nếu bản server mới hơn); `REJECTED` → `FAILED` + log.
- [ ] Đăng ký handler trong `SyncModule`/`SyncManager` khởi tạo.

#### Tiêu chí nghiệm thu ngày 9

- Tắt Wi-Fi + dữ liệu di động, đi bộ (ghi daily activity), bật mạng → server nhận đúng **một** bản.
- Gọi `POST /api/sync/reconcile` 2 lần với cùng payload → không nhân đôi, lần 2 trả `DUPLICATE`.
- Lô trộn exercise + daily activity: handler của A và B đều chạy, item lỗi không chặn item khác.

---

### NGÀY 10: [F8] SYNC HOÀN THIỆN & END-TO-END

- [ ] Kịch bản test E2E (ghi vào `BUGS.md`/tài liệu test):
  1. Offline → ghi daily activity → online → sync → đúng 1 bản.
  2. Gọi sync 2 lần liên tiếp.
  3. Mất mạng giữa lúc sync → item còn `PENDING`/`FAILED`, retry đúng.
  4. Kill app giữa lúc sync → mở lại, sync tiếp, không nhân đôi.
  5. Server trả `REJECTED` → item `FAILED`, không retry vô hạn.
  6. Server trả `CONFLICT` → local reconcile theo `serverVersion`.
- [ ] Xử lý `FAILED`: hiển thị last error trong `useSyncStatus`, cho phép "Thử lại" thủ công (reset state về PENDING + `next_attempt_at = now`).
- [ ] Kiểm thử reboot cho Steps (lặp lại ngày 3 trên máy thật, ghi kết quả).
- [ ] **Tiêu chí nghiệm thu:** AC-10, AC-11, AC-12 đạt (offline ghi được, sync đúng, không trùng); Sync chip phản ánh đúng trạng thái.

---

### NGÀY 11: [F9] LOCAL NOTIFICATION & TỐI ƯU PIN

#### Android Native (`com.fitsensemobile.notification`)

- [ ] `scheduleDailyReminders(startHour, endHour)`:
  - WorkManager periodic (~mỗi 1-2 giờ trong khung giờ) hoặc one-time tự lên lịch lại; unique work name.
  - Đọc steps hôm nay (từ `step_snapshots`/`local_activity` hoặc `StepCounterModule` logic).
  - Nhắc đạt bước: nếu chưa đạt goal (fallback 8000) vào cuối khung giờ.
  - Nhắc ít vận động: nếu không có bước mới trong ~60-90 phút trong khung giờ cho phép, tránh gửi lặp (lưu last-notified).
  - Không gửi ngoài khung giờ; không gửi nếu `POST_NOTIFICATIONS` bị từ chối.
- [ ] `cancelDailyReminders()`: cancel unique work.
- [ ] Thông báo hoàn thành bài tập: subscribe `EXERCISE_STATE` `FINISHED` phía JS → gọi `Notification.show` với channel `fitsense_goal`/`fitsense_activity` (không sửa `ExerciseModule` của A).
- [ ] `BootReceiver`: re-schedule reminder work sau reboot (đã có quyền `RECEIVE_BOOT_COMPLETED`).

#### Mobile (`src/features/notifications`)

- [ ] `NotificationSettingsScreen` (route đã khai báo hoặc thêm trong tab Profile nếu chưa có route — nếu thêm route phải sửa `navigation/types.ts`, đây là file B sở hữu):
  - Bật/tắt nhắc bước chân, nhắc ít vận động; chọn khung giờ (mặc định 08:00-21:00).
  - Gọi `Notification.ensureReady()`, `scheduleDailyReminders`, `cancelDailyReminders`.
  - Trạng thái bật/tắt giữ trong Zustand (không cần persist): lịch nhắc đã nằm trong WorkManager nên vẫn sống sau restart. Nếu cần nhớ lựa chọn UI qua restart thì báo A thêm AsyncStorage (tránh tự thêm dependency).
- [ ] Lắng nghe `EXERCISE_STATE` để hiện thông báo hoàn thành bài tập.

#### Tối ưu pin

- [ ] Đo pin 30 phút tracking (A chạy `LocationForegroundService`): ghi % pin trước/sau, thiết bị, phiên bản Android vào tài liệu test.
- [ ] Đề xuất/đo với A (A sở hữu `LocationForegroundService`):
  - Interval GPS thích ứng 2-5 giây khi chạy, dài hơn khi đứng yên.
  - `PRIORITY_BALANCED` khi phù hợp.
  - Hủy sensor khi không cần (B làm: `MotionSensor.stop()` khi rời màn hình/background — đã có ở ngày 6).
- [ ] Không tự sửa file location của A; nếu cần đổi, gửi yêu cầu + số đo.

#### Tiêu chí nghiệm thu ngày 11

- Nhận thông báo local đúng khung giờ trên máy thật (kể cả sau reboot).
- Từ chối `POST_NOTIFICATIONS` → không crash, UI hướng dẫn bật lại.
- Có bảng đo pin 30 phút tracking; không tăng tiêu hao bất thường so với baseline.

---

### NGÀY 12: KIỂM THỬ TOÀN DIỆN & ĐỔI VAI

#### Backend test (JUnit 5 + Mockito)

- [ ] `ActivityServiceTest`: daily, history phân trang, lọc user, không có dữ liệu, upsert last-write-wins.
- [ ] `GoalServiceTest`: CRUD, validate, ownership 403/404.
- [ ] `SyncServiceTest`: DUPLICATE, CONFLICT, REJECTED, lô bị ngắt, cập nhật `last_sync_at`.
- [ ] (Phối hợp A) Test tích hợp `mvn test` xanh toàn bộ.

#### Kotlin / Android test

- [ ] `StepBaselineCalculatorTest`: reboot, qua ngày, bỏ qua nhiều ngày, counter reset.
- [ ] `MovementClassifierTest`: STILL/WALKING/RUNNING, cửa sổ chưa đủ mẫu, nhiễu.
- [ ] `SyncBackoffTest`: công thức delay, jitter trong biên, attempts tăng.
- [ ] `DailyActivitySyncHandlerTest`: payload đúng schema, onResult mapping.

#### Mobile test (RNTL)

- [ ] Goals: render list, tạo/sửa/xóa, validate form, trạng thái lỗi.
- [ ] Dashboard: render số liệu, fallback profile mặc định, trạng thái loading/error.
- [ ] Sync chip: pending/syncing/error.

#### Test tay (bắt buộc)

- [ ] Reboot máy → steps không mất.
- [ ] Máy không có step counter/gyroscope → UI báo `UNAVAILABLE`.
- [ ] Mất mạng giữa lúc sync → retry đúng.
- [ ] Goal progress cập nhật theo bước thật.
- [ ] Nhắc local đúng giờ, không gửi ngoài khung.

#### Test chéo (bắt buộc)

- [ ] B dùng tài khoản khác, thử phá feature của A:
  - Gọi API exercise/analytics/profile của tài khoản khác → phải 403/404, không lộ dữ liệu.
  - Kill app khi đang GPS tracking → A khôi phục đúng (kiểm tra hộ).
  - Gọi `POST /api/exercises` trùng UUID → không nhân đôi.
- [ ] **AC-13:** xác nhận B không đọc/sửa được exercise, goal, profile của tài khoản khác; A cũng không đọc/sửa được goal/activity của B.
- [ ] Ghi lỗi vào `BUGS.md`, phân loại P0/P1/P2.

#### Tiêu chí nghiệm thu ngày 12

- `mvn test` xanh; Kotlin unit test xanh; test tay các mục trên đạt.
- Không còn lỗi P0; danh sách lỗi còn lại đã xếp ưu tiên.

---

### NGÀY 13: ĐÓNG BĂNG TÍNH NĂNG, BUILD RELEASE, TÀI LIỆU

- [ ] **Đóng băng tính năng:** từ 08:30 chỉ sửa lỗi, không thêm feature.
- [ ] Build APK release:
  - Keystore (không commit), cấu hình signing, `minifyEnabled` + ProGuard/R8 rules nếu cần.
  - Cài sạch trên máy thật (uninstall bản cũ trước), kiểm tra cold start + các tab.
- [ ] Seed dữ liệu mẫu cho demo:
  - Daily activities 14 ngày + goals mẫu; phối hợp A (`FitSenseBackend/scripts/seed_demo_data.sql`) để không trùng.
  - Tài khoản demo đã đăng nhập sẵn trên máy demo.
- [ ] Tài liệu theo phân công trong `06_DEMO_ACCEPTANCE_AND_RELEASE.md`:
  - `MOBILE_ARCHITECTURE.md` (navigation, feature structure, state).
  - `NATIVE_ANDROID_FEATURES.md` (StepCounter, MotionSensor, Notification, Sync, Room).
  - `OFFLINE_SYNC.md` (sơ đồ luồng: Room → queue → SyncManager → reconcile → handler; backoff; conflict).
  - `DATABASE_DESIGN.md` (ERD MySQL + Room).
  - `TESTING.md` (unit/integration/manual/cross-test, kết quả).
  - `IMPLEMENTATION_ROADMAP.md` (tiến độ thực tế).
- [ ] Cập nhật `openapi.yaml` phần Activity/Goal/Sync (mô tả, ví dụ, mã lỗi) — commit riêng.
- [ ] Nếu có đổi contract native: cập nhật `native-interface.d.ts` + báo A + commit riêng.
- [ ] Kiểm tra `.gitignore`: không commit keystore, `google-services.json` bản thật, service account, `.env`.

---

### NGÀY 14: DIỄN TẬP DEMO & DỰ PHÒNG

#### Kịch bản demo phần B

1. **Dashboard bước + reboot:** đi bộ, hiển thị steps/distance/calories; reboot máy → số bước vẫn còn, tiếp tục đếm.
2. **Cảm biến:** mở Sensor Monitor, đứng yên/đi/chạy → nhãn đổi đúng, X/Y/Z realtime, biểu đồ.
3. **Goals + thông báo:** tạo goal bước chân, đi bộ đạt goal, nhận thông báo local/FCM (FCM phần A).
4. **Offline sync:** bật airplane mode → đi bộ/ghi dữ liệu → tắt airplane mode → sync → server nhận đúng **một** bản; hiển thị chip sync.
5. **Kiểm tra chéo:** tài khoản 2 không thấy dữ liệu tài khoản 1.

#### Chuẩn bị dự phòng

- [ ] Quay video backup 3 phần: Dashboard/reboot, Sensor Monitor, Offline sync.
- [ ] Máy dự phòng pin 100%, đã đăng nhập tài khoản demo, đã seed dữ liệu.
- [ ] Chuẩn bị trả lời: vì sao 3 nơi lưu dữ liệu (Room/SQLite, Firestore, MySQL), xử lý reboot, idempotency, conflict resolution, độ chính xác sensor, giới hạn ước tính calo/pace.
- [ ] Gắn tag `v1.0` sau khi `main` đóng băng.

---

## 4. CHECKLIST HỢP ĐỒNG KỸ THUẬT VỚI DEVELOPER A

| Đối tượng | Trách nhiệm của B | Trách nhiệm của A |
|---|---|---|
| **Profile data** | Dùng `useProfile()` để tính stride/calories; fallback `170cm/70kg`; không tự đọc Firestore. | Cung cấp `useProfile()` shape ổn định (`heightCm`, `weightKg`). |
| **Exercise data** | Chỉ **đọc** `local_exercise` cho goal tuần; không ghi/sửa. | Ghi đầy đủ buổi tập + `status`/`is_completed` tương đương. |
| **todayActivity** | B sở hữu `useTodayActivity` + `local_activity`; giữ shape `{date, steps, distanceM, calories, activeMinutes}`. | A chỉ đọc, không ghi trực tiếp. |
| **SyncHandler** | B định nghĩa interface + registry + queue; viết `DailyActivitySyncHandler`. | A viết `ExerciseSyncHandler` (Kotlin) + `ExerciseSyncProcessor` (Spring) đúng interface. |
| **Sync API** | B sở hữu `POST /api/sync/reconcile` + registry + conflict daily. | A thêm processor EXERCISE; không sửa controller orchestration. |
| **API client** | Dùng chung `src/services/api/client.ts`; không tạo axios instance riêng. | Duy trì token, 401 handling, baseURL. |
| **SecurityConfig** | Không sửa. | A sở hữu; mở route public nếu cần. |
| **Hot files Android** | B sở hữu `AndroidManifest.xml`, `FitSensePackage.kt`, `FitSenseDatabase`, navigation. | A yêu cầu thay đổi qua B, không tự sửa. |
| **OpenAPI** | Chỉ sửa mục Activity/Goal/Sync của mình, commit riêng. | A sửa mục User/Exercise/Analytics/Notification. |
| **Native interface** | Sửa `.d.ts` khi đổi module của mình, commit riêng, báo A. | A làm tương tự cho `Exercise`. |
| **Git** | Nhánh `feature/f5-steps`, `feature/f7-goals`, ...; rebase `dev` mỗi sáng; PR nhỏ, merge ≥1 lần/ngày. | Review chéo; rebase `dev`; merge qua PR. |

---

## 5. NGUYÊN TẮC "THỬ LÀ ĐẠT" (ACCEPTANCE CRITERIA CỦA B)

- **AC-03 (Steps):** số bước hiển thị đúng trên máy thật, tăng realtime khi đi bộ.
- **AC-04 (Reboot stability):** reboot máy hoặc kill app → số bước hôm nay không mất, không đếm trùng.
- **AC-05 (Sensors):** accelerometer + gyroscope đọc được; nhãn `STILL`/`WALKING`/`RUNNING` đổi đúng; máy không có sensor báo `UNAVAILABLE`.
- **AC-08 (Goals):** CRUD goal chạy; progress tính từ dữ liệu thật; người khác không sửa được.
- **AC-10 (Offline record):** tắt mạng vẫn ghi được daily activity/buổi tập vào Room.
- **AC-11 (Sync):** có mạng → dữ liệu lên server đúng, trạng thái sync hiển thị.
- **AC-12 (No duplicates):** sync nhiều lần / gọi trùng → server chỉ có một bản.
- **AC-13 (Data isolation):** tài khoản khác không đọc/sửa được activity/goal/exercise/profile.
- **AC-14 (Permission/sensor unavailable):** từ chối quyền hoặc thiếu sensor → app hướng dẫn rõ ràng, không crash.

---

## 6. THỨ TỰ CẮT GIẢM KHI TRỄ (RIÊNG B)

Theo thứ tự ưu tiên cắt (tham chiếu mục 9 của `06_DEMO_ACCEPTANCE_AND_RELEASE.md`):

1. Nhắc ít vận động (giữ nhắc đạt bước).
2. Ghi `sensor_samples` (đã là tùy chọn).
3. Goal `WEEKLY_EXERCISE_DURATION` (giữ `WEEKLY_EXERCISE_COUNT`).
4. Màn "lịch sử goal đã đạt" nâng cao (giữ danh sách + progress).
5. Đo pin chi tiết (giữ tối ưu sensor lifecycle + báo cáo ngắn).
6. Conflict resolution nâng cao (giữ "server thắng" / last-write-wins).

**Không được cắt:** step counter + reboot, accelerometer/gyroscope, offline sync cơ bản không trùng, cô lập dữ liệu người dùng.

---

## 7. CÁCH DÙNG FILE NÀY VỚI AI (PROMPT TEMPLATE)

Khi giao việc cho AI theo từng ngày, dùng prompt theo mẫu sau (tránh AI bịa tên hàm/cột):

```text
Bạn là Developer B của dự án FitSense. Chỉ làm đúng phạm vi ngày <N> trong
fitsense-documentation/DEV_B_IMPLEMENTATION_PLAN.md.

Đọc trước:
- fitsense-documentation/DEV_B_IMPLEMENTATION_PLAN.md (mục ngày <N>)
- fitsense-documentation/OWNERSHIP.md
- fitsense-documentation/native-interface.d.ts
- fitsense-documentation/room-schema.md
- fitsense-documentation/openapi.yaml (chỉ endpoint Activity/Goal/Sync liên quan)
- Code hiện tại trong FitSenseMobile/src/features/<feature> và
  FitSenseMobile/android/app/src/main/java/com/fitsensemobile/<module>

Ràng buộc:
- Không đổi tên module/method/cột ngoài các file contract ở trên.
- Không sửa file nóng của A (SecurityConfig, exercise/location) hoặc V1/V2 migration.
- Mỗi feature một nhánh feature/<tên>; commit nhỏ; cập nhật tài liệu contract trước khi đổi interface.
- Viết test cho logic mới (Kotlin unit test hoặc JUnit/RNTL tùy tầng).
- Không thêm dependency mới nếu chưa báo A.

Đầu ra:
1. Danh sách file sẽ sửa/tạo.
2. Code + test.
3. Cách chạy/verify (lệnh cụ thể).
4. Những gì còn thiếu hoặc cần A phối hợp.
```

**Quy tắc khi dùng AI (theo mục 10):** dán đúng đặc tả + contract, yêu cầu đi theo mẫu feature trọn vẹn (DB → backend → native → mobile → test), dán log lỗi thật khi chạy máy thật, review thủ công trước khi merge. Chỗ AI hay sai cần kiểm tra kỹ: `foregroundServiceType`/quyền Android 13-14, bridge RN kiểu cũ, nhầm "steps since boot" với "steps today", lẫn UTC với giờ địa phương, thiếu kiểm tra `user_id` ở query, ngưỡng sensor hard-code không có config.

> Calories, pace, quãng đường và phân loại chuyển động là **ước tính**. Ghi rõ trong app và tài liệu, không trình bày như số đo y tế.
