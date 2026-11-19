# F8 Ngày 9 — Sync reconcile server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm `POST /api/sync/reconcile` tổng quát, xử lý từng item độc lập qua registry processor, phục vụ `DAILY_ACTIVITY` (B) và `EXERCISE` (A), đồng thời cập nhật `user_devices.last_sync_at`.

**Architecture:** DTO + interface `SyncProcessor` (B sở hữu) với registry inject `List<SyncProcessor>`. `DailyActivitySyncProcessor` tái dùng `ActivityService` LWW hiện có; `ExerciseSyncProcessorAdapter` bọc processor sẵn có của A mà không sửa file A. Mỗi processor tự chạy transaction riêng nên item lỗi chỉ trả `REJECTED` cho chính nó.

**Tech Stack:** Spring Boot 4, Java 21, JUnit 5 + Mockito, Jakarta Validation, Jackson 3 (`tools.jackson`), MySQL 8, Lombok.

**Spec:** `docs/superpowers/specs/2026-11-19-f8-day9-sync-reconcile-design.md`

## Global Constraints

- Không sửa file A: `exercise/*` (trừ đọc `ExerciseSyncProcessor`), `notification/*`, `SecurityConfig`, V1/V2 migrations.
- Không đổi client Day 8 (`/api/activities/sync` giữ nguyên hành vi).
- Không thêm dependency; dùng `JsonMapper` + `Validator` đã có trong Spring context.
- Batch tối đa **500** item; `deviceId` tối đa **128** ký tự.
- Không rollback cả lô khi một item lỗi; response HTTP 200 cho lô hợp lệ.
- `clientId` của `DAILY_ACTIVITY` = `<activityDate>|<timezoneId>`.
- Response giữ đúng thứ tự `items`; `serverTime` lấy từ bean `Clock`.
- `user_devices` tạo mới với `platform='android'`, `fcm_token=NULL`; lỗi ghi device chỉ log, không làm fail response.

## Review Focus

- Gửi cùng payload hai lần → lần hai `DUPLICATE`, bảng `daily_activities` vẫn một dòng/ngày.
- Một processor ném exception → các item còn lại vẫn được xử lý và trả kết quả (không 500 cả lô).
- `entityType` hợp lệ nhưng chưa có processor → item đó `REJECTED`, không ném lỗi.
- Chưa có row `user_devices` → tạo row `platform='android'`, `fcm_token=NULL`, `last_sync_at` khác null.
- Ghi `user_devices` lỗi → response vẫn trả đủ `results`.
- Payload daily sai (timezone lạ, steps âm) → `REJECTED`, không ghi DB.

---

### Task 1: DTO, `SyncProcessor`, `SyncContext`, mở `ActivityService.upsert`

**Files:**
- Create: `FitSenseBackend/src/main/java/com/example/fitsense/sync/dto/SyncItem.java`
- Create: `FitSenseBackend/src/main/java/com/example/fitsense/sync/dto/SyncReconcileRequest.java`
- Create: `FitSenseBackend/src/main/java/com/example/fitsense/sync/dto/SyncReconcileResponse.java`
- Create: `FitSenseBackend/src/main/java/com/example/fitsense/sync/service/SyncContext.java`
- Create: `FitSenseBackend/src/main/java/com/example/fitsense/sync/service/SyncProcessor.java`
- Modify: `FitSenseBackend/src/main/java/com/example/fitsense/activity/service/ActivityService.java:65-77,102-114`
- Test: `FitSenseBackend/src/test/java/com/example/fitsense/activity/ActivityServiceTest.java` (giữ nguyên, chỉ chạy lại)

**Interfaces:**
- Produces:
  - `record SyncItem(@NotNull SyncEntityType entityType, @NotBlank @Size(max=200) String clientId, @NotNull Map<String,Object> payload)`
  - `record SyncReconcileRequest(@NotBlank @Size(max=128) String deviceId, @NotEmpty @Size(max=500) List<@Valid SyncItem> items)`
  - `record SyncReconcileResponse(List<SyncItemResult> results, Instant serverTime)`
  - `record SyncContext(UUID userId, CurrentUser authUser)`
  - `interface SyncProcessor { SyncEntityType entityType(); SyncItemResult process(SyncContext context, SyncItem item); }`
  - `public SyncItemResult upsert(UUID userId, DailyActivityUpsert item)` trên `ActivityService`

- [ ] **Step 1: Tạo các DTO + interface**

Tạo 5 file đúng signature trong Interfaces. Không thêm method nào khác.

- [ ] **Step 2: Mở `ActivityService.upsert`**

Đổi `private SyncItemResult upsert(UUID userId, DailyActivityUpsert item)` thành `public`; chuyển `validateTimezone(item.timezoneId())` từ vòng lặp `sync(...)` vào đầu `upsert(...)` và bỏ dòng gọi trong `sync`. Hành vi `/api/activities/sync` không đổi.

- [ ] **Step 3: Chạy test hiện có**

Run: `cd FitSenseBackend; .\mvnw.cmd -o test -Dtest=ActivityServiceTest`
Expected: `Tests run: 9, Failures: 0, Errors: 0`.

- [ ] **Step 4: Commit**

```bash
git add FitSenseBackend/src/main/java/com/example/fitsense/sync/dto FitSenseBackend/src/main/java/com/example/fitsense/sync/service FitSenseBackend/src/main/java/com/example/fitsense/activity/service/ActivityService.java
git commit -m "feat(sync): reconcile DTOs and processor contract"
```

---

### Task 2: `DailyActivitySyncProcessor`

**Files:**
- Create: `FitSenseBackend/src/main/java/com/example/fitsense/sync/service/DailyActivitySyncProcessor.java`
- Test: `FitSenseBackend/src/test/java/com/example/fitsense/sync/DailyActivitySyncProcessorTest.java`

**Interfaces:**
- Consumes: `SyncProcessor`, `SyncContext`, `SyncItem`, `ActivityService.upsert(UUID, DailyActivityUpsert)`, `DailyActivityUpsert`, `SyncItemResult`.
- Produces: `@Component` bean `DailyActivitySyncProcessor` với `entityType() == SyncEntityType.DAILY_ACTIVITY`.

**Thiết kế bắt buộc:**
- `process`: `jsonMapper.convertValue(item.payload(), DailyActivityUpsert.class)`.
- Validate bằng `jakarta.validation.Validator`; nếu có violation → `SyncItemResult.of(DAILY_ACTIVITY, item.clientId(), REJECTED, message của violation đầu tiên)`.
- Gọi `activityService.upsert(context.userId(), upsert)` và trả nguyên kết quả.
- Bắt `ApiException` → `REJECTED` + `ex.getMessage()`.
- Bắt `RuntimeException` còn lại → `REJECTED` + `"Invalid daily activity payload: " + ex.getMessage()`.

- [ ] **Step 1: Viết test thất bại**

Test class dùng `JsonMapper jsonMapper = new JsonMapper();`, `Validator validator = Validation.buildDefaultValidatorFactory().getValidator();`, mock `ActivityService`.

Các test (tên + assertion chính):
- `returnsCreatedFromActivityService`: payload hợp lệ (`activityDate=2026-11-19`, `timezoneId=Asia/Saigon`, `steps=100`, `distanceM=80.0`, `calories=4.0`, `activeMinutes=1`, `updatedAt=2026-11-19T06:00:00Z`); stub `upsert` trả `SyncItemResult.of(DAILY_ACTIVITY, "2026-11-19|Asia/Saigon", CREATED, "Inserted")`; assert `entityType`, `clientId`, `status == CREATED`.
- `rejectsNegativeSteps`: payload `steps=-1`; assert `REJECTED`, `reason` chứa `steps`; `verify(activityService, never()).upsert(any(), any())`.
- `rejectsUnknownTimezone`: stub `upsert` ném `new ApiException(ErrorCode.VALIDATION_ERROR, "Unknown timezoneId: Mars/Olympus")`; assert `REJECTED` và reason chứa `Unknown timezoneId`.
- `rejectsUnparseablePayload`: payload `Map.of("steps", "abc")`; assert `REJECTED`, reason chứa `Invalid daily activity payload`.
- `returnsDuplicateFromActivityService`: stub trả `DUPLICATE`; assert passthrough.

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd FitSenseBackend; .\mvnw.cmd -o test -Dtest=DailyActivitySyncProcessorTest`
Expected: FAIL — class chưa tồn tại.

- [ ] **Step 3: Viết processor tối thiểu**

```java
@Component
@RequiredArgsConstructor
public class DailyActivitySyncProcessor implements SyncProcessor {
    private final ActivityService activityService;
    private final JsonMapper jsonMapper;
    private final Validator validator;

    @Override
    public SyncEntityType entityType() { return SyncEntityType.DAILY_ACTIVITY; }

    @Override
    public SyncItemResult process(SyncContext context, SyncItem item) {
        // convertValue + validator.validate; REJECTED đầu tiên nếu violation
        // activityService.upsert(context.userId(), upsert)
        // bắt ApiException / RuntimeException theo Thiết kế bắt buộc
    }
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `cd FitSenseBackend; .\mvnw.cmd -o test -Dtest=DailyActivitySyncProcessorTest`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add FitSenseBackend/src/main/java/com/example/fitsense/sync/service/DailyActivitySyncProcessor.java FitSenseBackend/src/test/java/com/example/fitsense/sync/DailyActivitySyncProcessorTest.java
git commit -m "feat(sync): daily activity reconcile processor"
```

---

### Task 3: `ExerciseSyncProcessorAdapter`

**Files:**
- Create: `FitSenseBackend/src/main/java/com/example/fitsense/sync/service/ExerciseSyncProcessorAdapter.java`
- Test: `FitSenseBackend/src/test/java/com/example/fitsense/sync/ExerciseSyncProcessorAdapterTest.java`

**Interfaces:**
- Consumes: `com.example.fitsense.exercise.service.ExerciseSyncProcessor.process(CurrentUser, Map<String,Object>)` → `SyncOutcome(String status, String reason, Object serverVersion)`.
- Produces: `@Component` bean `entityType() == SyncEntityType.EXERCISE`.

**Thiết kế bắt buộc:**
- Gọi delegate với `context.authUser()` và `item.payload()`.
- Map `"CREATED"|"DUPLICATE"|"CONFLICT"` sang `SyncStatus` cùng tên; mọi giá trị khác → `REJECTED`.
- `SyncItemResult` dùng `item.entityType()`, `item.clientId()`, `outcome.reason()`, `outcome.serverVersion()`.

- [ ] **Step 1: Viết test thất bại**

Mock `ExerciseSyncProcessor`; `CurrentUser user = new CurrentUser("uid-1", "a@fitsense.app")`; `SyncItem item = new SyncItem(SyncEntityType.EXERCISE, "client-1", Map.of("id", "x"))`.

Tests:
- `passesCreatedThrough`: delegate trả `new SyncOutcome("CREATED", null, Map.of("id", "x"))`; assert status `CREATED`, `clientId == "client-1"`, `serverVersion` bằng map.
- `passesDuplicateThrough` → `DUPLICATE`.
- `passesConflictThrough` → `CONFLICT`.
- `mapsUnknownStatusToRejected` với `"WHATEVER"` → `REJECTED`.
- `callsDelegateWithAuthUserAndPayload`: `verify(delegate).process(user, item.payload())`.

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd FitSenseBackend; .\mvnw.cmd -o test -Dtest=ExerciseSyncProcessorAdapterTest`
Expected: FAIL — class chưa tồn tại.

- [ ] **Step 3: Viết adapter**

Theo Thiết kế bắt buộc; dùng `SyncStatus.valueOf` trong `try/catch (IllegalArgumentException)` để map, sai thì `REJECTED`.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `cd FitSenseBackend; .\mvnw.cmd -o test -Dtest=ExerciseSyncProcessorAdapterTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add FitSenseBackend/src/main/java/com/example/fitsense/sync/service/ExerciseSyncProcessorAdapter.java FitSenseBackend/src/test/java/com/example/fitsense/sync/ExerciseSyncProcessorAdapterTest.java
git commit -m "feat(sync): adapt exercise processor into reconcile registry"
```

---

### Task 4: `SyncService`

**Files:**
- Create: `FitSenseBackend/src/main/java/com/example/fitsense/sync/service/SyncService.java`
- Test: `FitSenseBackend/src/test/java/com/example/fitsense/sync/SyncServiceTest.java`

**Interfaces:**
- Consumes: `List<SyncProcessor>`, `UserService.getOrCreateCurrentUser(CurrentUser)`, `UserDeviceRepository.findByUserIdAndDeviceId(UUID, String)`, `UserDeviceRepository.save(UserDeviceEntity)`, `Clock`.
- Produces: `SyncReconcileResponse reconcile(CurrentUser authUser, SyncReconcileRequest request)`.

**Thiết kế bắt buộc:**
- Resolve `userId` một lần; registry = map `SyncProcessor::entityType` (nếu trùng key, giữ processor đầu).
- Không có processor → `REJECTED`, reason `"Unsupported entityType"`.
- Bọc từng `processor.process(...)` trong `try/catch (Exception)` → `REJECTED` + `ex.getMessage()`; log `warn`.
- Sau vòng lặp: `findByUserIdAndDeviceId`, tạo mới nếu trống với `platform="android"`, `id=UUID.randomUUID()`, set `lastSyncAt = Instant.now(clock)`, `save`; toàn bộ bọc `try/catch (Exception)` chỉ log.
- Trả `new SyncReconcileResponse(results, Instant.now(clock))`.
- Không đặt `@Transactional` trên `reconcile`.

- [ ] **Step 1: Viết test thất bại**

Mock `SyncProcessor daily`, `SyncProcessor exercise`, `UserService`, `UserDeviceRepository`; `Clock.fixed(Instant.parse("2026-11-19T07:00:00Z"), ZoneOffset.UTC)`; stub user trả `UserResponse.builder().id(userId).build()`.

Tests:
- `dispatchesItemsToTheirProcessorsAndKeepsOrder`: items `[daily item, exercise item]`; stub daily → CREATED, exercise → DUPLICATE; assert results `[CREATED, DUPLICATE]` theo thứ tự, `serverTime == 2026-11-19T07:00:00Z`.
- `rejectsItemWithoutRegisteredProcessor`: chỉ inject daily; item `EXERCISE` → `REJECTED`; verify không processor nào bị gọi cho item đó.
- `isolatesProcessorFailure`: daily ném `IllegalStateException("boom")` cho item 1, trả CREATED cho item 2 (dùng `when(...).thenThrow(...).thenReturn(...)`); assert item 1 `REJECTED`, item 2 `CREATED`.
- `updatesExistingDeviceLastSyncAt`: repo trả device có sẵn; assert `lastSyncAt == fixed instant`, `save(device)`.
- `createsDeviceRowWhenMissing`: repo `Optional.empty()`; `ArgumentCaptor<UserDeviceEntity>`; assert `platform == "android"`, `fcmToken == null`, `lastSyncAt == fixed instant`, `id != null`.
- `deviceBookkeepingFailureDoesNotFailBatch`: repo `find...` ném `RuntimeException`; assert `reconcile` vẫn trả results.
- `resolvesUserBeforeProcessing`: verify `userService.getOrCreateCurrentUser(authUser)` gọi đúng một lần.

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd FitSenseBackend; .\mvnw.cmd -o test -Dtest=SyncServiceTest`
Expected: FAIL — class chưa tồn tại.

- [ ] **Step 3: Viết `SyncService`**

Theo Thiết kế bắt buộc; dùng `LinkedHashMap`/`Collectors.toMap` với merge giữ first.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `cd FitSenseBackend; .\mvnw.cmd -o test -Dtest=SyncServiceTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add FitSenseBackend/src/main/java/com/example/fitsense/sync/service/SyncService.java FitSenseBackend/src/test/java/com/example/fitsense/sync/SyncServiceTest.java
git commit -m "feat(sync): reconcile service with per-item isolation"
```

---

### Task 5: `SyncController` thay placeholder + verify thật

**Files:**
- Create: `FitSenseBackend/src/main/java/com/example/fitsense/sync/controller/SyncController.java`
- Delete: `FitSenseBackend/src/main/java/com/example/fitsense/sync/controller/SyncPlaceholderController.java`

**Interfaces:**
- Consumes: `SyncService.reconcile(CurrentUser, SyncReconcileRequest)`, `@AuthenticatedUser CurrentUser`, `ApiResponse.ok`.
- Produces: `POST /api/sync/reconcile` → `ApiResponse<SyncReconcileResponse>`.

- [ ] **Step 1: Viết controller**

`@RestController @RequestMapping("/api/sync")`, constructor injection `SyncService`; method:
`@PostMapping("/reconcile") public ApiResponse<SyncReconcileResponse> reconcile(@AuthenticatedUser CurrentUser authUser, @Valid @RequestBody SyncReconcileRequest request)`. Thêm `@Tag(name="Sync")` + `@SecurityRequirement(name="bearerAuth")` giống `ActivityController`. Xoá file placeholder.

- [ ] **Step 2: Build + toàn bộ test backend**

Run: `cd FitSenseBackend; .\mvnw.cmd -o test`
Expected: `BUILD SUCCESS`, không test nào fail.

- [ ] **Step 3: Verify thật với backend dev**

Chạy backend profile dev cổng 8090 (như Ngày 8), rồi:

```powershell
$body = '{"deviceId":"test-device","items":[{"entityType":"DAILY_ACTIVITY","clientId":"2026-11-19|Asia/Saigon","payload":{"activityDate":"2026-11-19","timezoneId":"Asia/Saigon","steps":10,"distanceM":7.0,"calories":0.35,"activeMinutes":0,"updatedAt":"2026-11-19T07:00:00Z"}}]}'
Invoke-RestMethod -Uri http://localhost:8090/api/sync/reconcile -Method POST -ContentType 'application/json' -Headers @{Authorization='Bearer dev-token'} -Body $body
```

Expected lần 1: `results[0].status == "CREATED"`. Chạy lại cùng body → `DUPLICATE`; đổi `updatedAt` sang `2026-11-19T06:00:00Z` → `CONFLICT`.
Query MySQL: `SELECT COUNT(*) FROM daily_activities WHERE activity_date='2026-11-19';` → 1; `SELECT device_id, platform, fcm_token, last_sync_at FROM user_devices WHERE device_id='test-device';` → 1 row, platform `android`, fcm_token NULL, last_sync_at khác NULL.
Dọn dữ liệu test (`dev-user` cascade) sau khi xong.

- [ ] **Step 4: Commit**

```bash
git add FitSenseBackend/src/main/java/com/example/fitsense/sync/controller
git commit -m "feat(sync): expose POST /api/sync/reconcile"
```

---

## Verification summary

- `cd FitSenseBackend; .\mvnw.cmd -o test` — toàn bộ xanh.
- Reconcile thật: CREATED → DUPLICATE → CONFLICT; one row/day; `user_devices.last_sync_at` được set.
- Không file A/migration/client Day 8 nào bị sửa (`git diff --stat origin/main...HEAD` chỉ có `activity/service`, `sync/*`, test).
