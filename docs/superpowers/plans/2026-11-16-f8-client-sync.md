# F8 Ngày 8 — Client Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đẩy `local_activity` còn `PENDING` lên `POST /api/activities/sync` một cách offline-safe, không trùng lặp, và làm chip Dashboard phản ánh đúng trạng thái.

**Architecture:** Native (Kotlin) chỉ cung cấp primitive hàng đợi trên Room; JS `syncManager` điều phối bằng `axios` + NetInfo sẵn có. Queue upsert theo `(entity_type, client_id)` giữ payload mới nhất, retry có backoff, sync lúc app start/khi có mạng.

**Tech Stack:** React Native 0.87, TypeScript, Zustand, axios, NetInfo, Kotlin, Room 2.7, Jest.

**Spec:** `docs/superpowers/specs/2026-11-16-f8-client-sync-design.md`

## Global Constraints

- Không thêm dependency, không đổi schema Room, không sửa file của A (`SecurityConfig`, exercise/location, `V1/V2` migrations).
- Batch tối đa **31** item mỗi request; tối đa **10** batch mỗi lần `syncNow()`.
- `clientId = "<activityDate>|<timezoneId>"`; `updatedAt` gửi dạng ISO-8601 UTC.
- Retry: `min(60s * 2^attempts, 30min) * random(0.5..1.5)`.
- 400 → `FAILED`, không retry; lỗi mạng/5xx/401 → retry.
- Chỉ sync khi `useAuthStore.getState().isAuthenticated === true`.
- `pending` trên chip = `PENDING + SYNCING + FAILED`.
- Không xoá `local_activity`/`sync_queue` trước khi server xác nhận, trừ logout.

## Review Focus

- **Cùng ngày ghi nhiều lần:** enqueue lại phải cập nhật payload, không giữ giá trị 31 bước đầu tiên.
- **Row `EXERCISE` của A:** không được lọt vào batch `DAILY_ACTIVITY` và làm 400 cả lô.
- **Kill app giữa sync:** item kẹt `SYNCING` phải quay lại `PENDING`, không mất, không nhân đôi.
- **Mất mạng rồi có lại khi app vẫn mở:** timer `next_attempt_at` phải tự chạy, không chỉ dựa NetInfo.
- **Đăng xuất khi offline:** dữ liệu chưa sync bị xoá có chủ đích; không được rò sang tài khoản kế tiếp.

---

### Task 1: Native queue primitives

**Files:**
- Modify: `FitSenseMobile/android/app/src/main/java/com/fitsensemobile/database/dao/SyncQueueDao.kt`
- Modify: `FitSenseMobile/android/app/src/main/java/com/fitsensemobile/database/dao/LocalActivityDao.kt`
- Modify: `FitSenseMobile/android/app/src/main/java/com/fitsensemobile/sync/SyncModule.kt`
- Modify: `FitSenseMobile/src/types/native-interface.d.ts:193-222`
- Modify: `FitSenseMobile/src/services/native/mock.ts` (block `Sync`)

**Interfaces:**
- Produces (Kotlin DAO): `enqueue(entityType, clientId, operation, payload, now)`, `getDue(entityType, now, limit)`, `markSyncing(ids, now)`, `markSynced(ids, now)`, `markFailed(id, attempts, nextAttemptAt, error, now)`, `deleteSynced(olderThan)`, `resetSyncing(now)`, `countUnsynced()`, `clearAll()`; `LocalActivityDao.getUnsynced(limit)`, `markSyncState(date, state)`, `clearAll()`.
- Produces (TS): `SyncQueueRow { id; entityType; clientId; payloadJson; attempts; nextAttemptAtMs }` and `SyncModule` with `enqueue`, `getDue`, `markSyncing`, `markSynced`, `markFailed`, `getPendingCount`, `deleteSynced`, `resetSyncing`, `clearAll`.

- [ ] **Step 1: Replace `SyncQueueDao` with upsert + queue lifecycle queries**

Use raw SQLite UPSERT so re-enqueue resets state (Room `@Upsert` conflicts on primary key, not the unique index):

```kotlin
@Query("""
    INSERT INTO sync_queue (entity_type, client_id, operation, payload, state, attempts, next_attempt_at, last_error, created_at, updated_at)
    VALUES (:entityType, :clientId, :operation, :payload, 'PENDING', 0, :now, NULL, :now, :now)
    ON CONFLICT(entity_type, client_id) DO UPDATE SET
      operation = excluded.operation, payload = excluded.payload, state = 'PENDING',
      attempts = 0, next_attempt_at = excluded.next_attempt_at, last_error = NULL,
      updated_at = excluded.updated_at
""")
suspend fun enqueue(entityType: String, clientId: String, operation: String, payload: String, now: Long)
```

Keep `getDue(entityType, now, limit)` filtering `state = 'PENDING' AND next_attempt_at <= :now AND entity_type = :entityType`, and add the mark/reset/count/clear queries named in Interfaces. `countUnsynced` counts `state IN ('PENDING','SYNCING','FAILED')`.

- [ ] **Step 2: Extend `LocalActivityDao`**

Add `getUnsynced(limit)` (`sync_state != 'SYNCED' ORDER BY activity_date ASC LIMIT :limit`), `markSyncState(date, state)`, `clearAll()`.

- [ ] **Step 3: Implement `SyncModule` primitives**

Remove `syncNow`, `registerHandler`, `getLastSyncAt`. Each method runs on `Executors.newSingleThreadExecutor()` with `runBlocking`, mirroring `LocalDbModule`. `getDue` returns a `WritableArray` of maps with `payloadJson` (the stored string), `id`, `entityType`, `clientId`, `attempts`, `nextAttemptAtMs`. `enqueue` serializes `ReadableMap` with `Arguments.toBundle(...)` → `JSONObject` → string, `operation = "UPSERT"`.

- [ ] **Step 4: Update `native-interface.d.ts` and `mockNative.Sync`**

Add `SyncQueueRow`; replace the `SyncModule` methods with the Interfaces list. Update mock methods to no-op/`[]`/`0` with the same signatures.

- [ ] **Step 5: Compile native**

Run: `cd FitSenseMobile/android; .\gradlew.bat :app:compileDebugKotlin`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 6: Commit**

```bash
git add FitSenseMobile/android/app/src/main/java/com/fitsensemobile/database/dao FitSenseMobile/android/app/src/main/java/com/fitsensemobile/sync FitSenseMobile/src/types/native-interface.d.ts FitSenseMobile/src/services/native/mock.ts
git commit -m "feat(sync): native queue primitives for daily activity"
```

---

### Task 2: Pure payload + backoff helpers

**Files:**
- Create: `FitSenseMobile/src/services/sync/backoff.ts`
- Create: `FitSenseMobile/src/services/sync/dailyActivity.ts`
- Test: `FitSenseMobile/src/services/sync/__tests__/backoff.test.ts`
- Test: `FitSenseMobile/src/services/sync/__tests__/dailyActivity.test.ts`

**Interfaces:**
- Produces: `backoffDelayMs(attempts: number, random?: () => number): number`.
- Produces: `DailyActivityUpsert { activityDate: string; timezoneId: string; steps: number; distanceM: number; calories: number; activeMinutes: number; updatedAt: string }` (exported from `dailyActivity.ts`).
- Produces: `dailyActivityClientId(row: StepSnapshotRow): string`.
- Produces: `toDailyActivityPayload(row: StepSnapshotRow): DailyActivityUpsert` with `{ activityDate: row.date, timezoneId: row.timezoneId, steps, distanceM, calories, activeMinutes, updatedAt: new Date(row.updatedAtMs).toISOString() }`.

- [ ] **Step 1: Write failing helper tests**

```ts
// backoff.test.ts
import { backoffDelayMs } from '../backoff';

test('doubles per attempt and caps at 30 minutes', () => {
  expect(backoffDelayMs(0, () => 0.5)).toBe(60_000);
  expect(backoffDelayMs(1, () => 0.5)).toBe(120_000);
  expect(backoffDelayMs(20, () => 0.5)).toBe(1_800_000);
});

test('applies jitter between 0.5x and 1.5x', () => {
  expect(backoffDelayMs(0, () => 0)).toBe(30_000);
  expect(backoffDelayMs(0, () => 0.999999)).toBe(90_000);
});
```

```ts
// dailyActivity.test.ts
import { dailyActivityClientId, toDailyActivityPayload } from '../dailyActivity';

const row = { date: '2026-11-16', timezoneId: 'Asia/Ho_Chi_Minh', steps: 25, distanceM: 0.02, calories: 1, activeMinutes: 0, updatedAtMs: 1763280000000, syncState: 'PENDING' as const };

test('builds clientId exactly like the backend', () => {
  expect(dailyActivityClientId(row)).toBe('2026-11-16|Asia/Ho_Chi_Minh');
});

test('maps row to DailyActivityUpsert with ISO UTC updatedAt', () => {
  expect(toDailyActivityPayload(row)).toEqual({
    activityDate: '2026-11-16', timezoneId: 'Asia/Ho_Chi_Minh', steps: 25,
    distanceM: 0.02, calories: 1, activeMinutes: 0,
    updatedAt: new Date(1763280000000).toISOString(),
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd FitSenseMobile; npx jest src/services/sync/__tests__/backoff.test.ts src/services/sync/__tests__/dailyActivity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helpers**

`backoffDelayMs`: `Math.round(Math.min(60_000 * 2 ** attempts, 1_800_000) * (0.5 + random() * 1))`.

- [ ] **Step 4: Run tests to verify they pass**

Run the Step 2 command. Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add FitSenseMobile/src/services/sync
git commit -m "feat(sync): payload and backoff helpers"
```

---

### Task 3: Activity API wrapper

**Files:**
- Create: `FitSenseMobile/src/services/sync/activityApi.ts`
- Test: `FitSenseMobile/src/services/sync/__tests__/activityApi.test.ts`

**Interfaces:**
- Consumes: `apiClient` from `../api/client`, `ApiEnvelope` from `../api/health`, `DailyActivityUpsert` from `./dailyActivity`.
- Produces: `syncDailyActivities(items: DailyActivityUpsert[]): Promise<SyncItemResult[]>`; `SyncItemResult { entityType: 'DAILY_ACTIVITY'; clientId: string; status: 'CREATED'|'DUPLICATE'|'CONFLICT'|'REJECTED'; reason?: string; serverVersion?: Record<string, unknown> }`.

- [ ] **Step 1: Write failing test**

```ts
import { apiClient } from '../../api/client';
import { syncDailyActivities } from '../activityApi';

jest.mock('../../api/client', () => ({ apiClient: { post: jest.fn() } }));

test('posts items and returns result array', async () => {
  const results = [{ entityType: 'DAILY_ACTIVITY', clientId: '2026-11-16|UTC', status: 'CREATED' }];
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, data: results } });
  const items = [{ activityDate: '2026-11-16', timezoneId: 'UTC', steps: 1, distanceM: 0, calories: 0, activeMinutes: 0, updatedAt: '2026-11-16T00:00:00Z' }];
  await expect(syncDailyActivities(items)).resolves.toEqual(results);
  expect(apiClient.post).toHaveBeenCalledWith('/api/activities/sync', { items });
});
```

- [ ] **Step 2: Run to fail** — `npx jest src/services/sync/__tests__/activityApi.test.ts` → FAIL module not found.

- [ ] **Step 3: Implement** — `const response = await apiClient.post<ApiEnvelope<SyncItemResult[]>>('/api/activities/sync', { items }); return response.data.data ?? [];`

- [ ] **Step 4: Run to pass** — same command, PASS.

- [ ] **Step 5: Commit** — `git add FitSenseMobile/src/services/sync; git commit -m "feat(sync): activity sync API wrapper"`

---

### Task 4: `syncManager` orchestration

**Files:**
- Modify: `FitSenseMobile/src/services/sync/index.ts` (keep exported `syncManager`)
- Modify: `FitSenseMobile/src/stores/useSyncStatus.ts` (no shape change)
- Test: `FitSenseMobile/src/services/sync/__tests__/syncManager.test.ts`

**Interfaces:**
- Consumes: `Sync` primitives (Task 1), helpers (Task 2), `syncDailyActivities` (Task 3), `useAuthStore`, `useSyncStatus`.
- Produces: `syncManager.enqueueDailyActivity(row)`, `syncManager.syncNow(): Promise<{processed:number;failed:number}>`, `syncManager.start(): void`, `syncManager.stop(): void`, `syncManager.clearLocalData(): Promise<void>`, `syncManager.registerHandler(handler)` (unchanged, kept for A).

- [ ] **Step 1: Write failing tests**

Cover: enqueue cập nhật payload; `getDue` chỉ được gọi với `'DAILY_ACTIVITY'`; batch ≤31; `CREATED/DUPLICATE/CONFLICT` → `markSynced` (kèm `markSyncState` theo ngày tách từ `clientId`); 400 → `markFailed` không retry; network error → `markFailed` + `nextAttemptAtMs > now` và có `setTimeout` hẹn lần sau (fake timers); `resetSyncing` chạy lần đầu; kết quả theo `clientId`; `pending` gồm `FAILED`; `clearLocalData` gọi `stop` → `syncNow` → `clearAll`. Mock `../native` (`Sync`), `./activityApi`, `../api/errors` nếu cần, `../../stores/useAuthStore`; dùng `useSyncStatus` thật và reset trong `beforeEach`. Example cho case quan trọng nhất:

```ts
test('re-enqueueing the same day stores the newest payload', async () => {
  useAuthStore.setState({ isAuthenticated: true } as any);
  await syncManager.enqueueDailyActivity({ ...row, steps: 25 });
  await syncManager.enqueueDailyActivity({ ...row, steps: 900 });
  expect(Sync.enqueue).toHaveBeenLastCalledWith('DAILY_ACTIVITY', '2026-11-16|UTC', expect.objectContaining({ steps: 900 }));
});
```

- [ ] **Step 2: Run to fail** — `npx jest src/services/sync/__tests__/syncManager.test.ts` → FAIL.

- [ ] **Step 3: Implement `syncNow`**

Guard `syncing` + `isAuthenticated` + `NetInfo.fetch().isConnected`. On first run: `Sync.resetSyncing()`, `Sync.deleteSynced(Date.now() - 30*864e5)`, backfill via `LocalDb.getUnsynced` → `Sync.enqueue` (skip if already enqueued is handled by native upsert). Then loop ≤10: `Sync.getDue('DAILY_ACTIVITY', 31)`, `markSyncing(ids)`, build items via `JSON.parse(payloadJson)`, `syncDailyActivities`, map results by `clientId`:

```ts
CREATED | DUPLICATE | CONFLICT -> Sync.markSynced(ids); Sync.markSyncState(date,'SYNCED')
other / missing result            -> Sync.markFailed(id, attempts+1, Date.now()+backoffDelayMs(attempts), reason)
```

Catch `ApiError`: `status === 400` → mark all `FAILED` (`nextAttemptAt = Number.MAX_SAFE_INTEGER`); otherwise mark failed with backoff. Emit status through `useSyncStatus.getState().setStatus({ pending: await Sync.getPendingCount(), syncing, lastSyncAtMs, lastError })` in a `finally`. Schedule `setTimeout(this.syncNow, earliestDue - now)` when any `FAILED`, clear previous timer; skip when offline/stopped. `stop()` clears timer + NetInfo unsubscribe. `start()` registers `NetInfo.addEventListener` (connected → `syncNow`) and runs `syncNow` immediately. `clearLocalData()` = `stop(); await syncNow().catch(()=>{}); await Sync.clearAll(); useSyncStatus.getState().reset();`.

- [ ] **Step 4: Run to pass** — same command, PASS.

- [ ] **Step 5: Commit** — `git add FitSenseMobile/src/services/sync FitSenseMobile/src/stores/useSyncStatus.ts; git commit -m "feat(sync): orchestrate daily activity queue"`

---

### Task 5: Wire startup, Dashboard, logout

**Files:**
- Modify: `FitSenseMobile/src/app/providers/AuthProvider.tsx`
- Modify: `FitSenseMobile/src/stores/useAuthStore.ts`
- Modify: `FitSenseMobile/src/features/steps-dashboard/screens/DashboardScreen.tsx:93-130`
- Delete: `FitSenseMobile/src/features/sync/index.ts` (placeholder comment only)
- Test: `FitSenseMobile/src/app/providers/__tests__/AuthProvider.test.tsx`
- Test: `FitSenseMobile/src/stores/__tests__/useAuthStore.test.ts` (create)

**Interfaces:**
- Consumes: `syncManager` (Task 4).
- Produces: provider starts sync on login, stops on logout; Dashboard enqueues every persist; signOut clears local data before Firebase sign-out.

- [ ] **Step 1: Update tests (failing)**

In `AuthProvider.test.tsx`, mock `../../../services/sync` and assert `syncManager.start` after a user resolves, `syncManager.stop` when no user. New `useAuthStore.test.ts`: mock Firebase auth + `../../services/sync`, call `signOut()`, assert `clearLocalData` resolved before `firebaseSignOut`, and state cleared.

- [ ] **Step 2: Run to fail** — `npx jest src/app/providers/__tests__/AuthProvider.test.tsx src/stores/__tests__/useAuthStore.test.ts` → FAIL.

- [ ] **Step 3: Implement wiring**

- `AuthProvider`: call `syncManager.start()` after `setSession(...)`; call `syncManager.stop()` in the `!user` branch.
- `useAuthStore.signOut`: `const { syncManager } = await import('../../services/sync'); await syncManager.clearLocalData(); await firebaseSignOut(getAuth()); set({...})` (dynamic import avoids the store ↔ api-client cycle).
- `DashboardScreen.persist` and the unmount writer: after `LocalDb.upsertTodayActivity(row)`, `await syncManager.enqueueDailyActivity(row)` inside the existing `try/catch` style (`.catch(() => {})` for unmount).
- Delete `src/features/sync/index.ts`.

- [ ] **Step 4: Run to pass** — same command, PASS.

- [ ] **Step 5: Typecheck + full Jest**

Run: `cd FitSenseMobile; npx tsc --noEmit; npx jest`
Expected: no new TS errors (pre-existing `features/analytics` errors allowed); all suites pass.

- [ ] **Step 6: Commit** — `git add ...; git commit -m "feat(sync): wire startup, dashboard enqueue and logout clearing"`

---

### Task 6: End-to-end verification

**Files:** none.

- [ ] **Step 1: Build native + bundle**

Run: `cd FitSenseMobile/android; .\gradlew.bat assembleDebug`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 2: Install and sync on device**

```bash
adb install -r FitSenseMobile/android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.fitsensemobile 1
```
Mở Dashboard, đợi ≥10s, xem chip chuyển "Đã đồng bộ" và queue rỗng.

- [ ] **Step 3: Verify server rows**

```sql
SELECT activity_date, steps, client_updated_at FROM daily_activities ORDER BY activity_date;
```
Expected: có dòng 2026-11-14/15/16 (backfill) đúng số bước trong Room, không trùng ngày.

- [ ] **Step 4: Duplicate check** — bấm tắt/bật mạng để sync chạy lại; query lại: số dòng không đổi.

- [ ] **Step 5: Offline + retry check** — tắt Wi-Fi/dữ liệu, đi bộ vài phút, bật mạng: item `PENDING` → `SYNCED`; kill app giữa lúc sync, mở lại: không mất, không nhân đôi.

- [ ] **Step 6: Logout check** — đăng xuất, query Room (`sync_queue`, `local_activity`) rỗng; đăng nhập tài khoản khác: không thấy dữ liệu user cũ.
