# F5 — STEPS + DASHBOARD

**Owner:** Member B  
**Scope:** Android step counter, reboot-safe daily baseline, daily activity summary, and dashboard.

## Implementation tasks from the project roadmap

The tasks below are extracted from the day-by-day plan. Keep the original sequence and completion conditions.

### #### Ngày 2

**B: [F5] Steps (phần 1, native)**
- [ ] Native: `StepCounterModule` thật: kiểm tra phần cứng, xin quyền `ACTIVITY_RECOGNITION`, listener theo lifecycle, emit event. Trạng thái `UNAVAILABLE`/`DENIED`.
- [ ] Mobile: hook `useStepCounter`, màn tạm hiển thị số bước thô và trạng thái quyền.
- [ ] Room: `step_snapshots` DAO thật.

**Hoàn thành khi:** A đăng nhập thật và `users/me` trả đúng; B thấy số bước thô trên máy thật.

### #### Ngày 3

**B: [F5] Steps (phần 2, logic baseline)**
- [ ] `bước hôm nay = counter hiện tại − counter lúc 00:00 giờ địa phương`, phát hiện reboot bằng `BOOT_COUNT` hoặc counter nhỏ hơn snapshot, giữ bước trước reboot.
- [ ] `StepSnapshotWorker` (WorkManager ~15 phút) và `BootReceiver`.
- [ ] Chốt ngày hôm trước khi người dùng không mở app. Restart app không đếm trùng.
- [ ] **Unit test thuần Kotlin:** reboot, qua ngày, bỏ qua nhiều ngày, counter reset giữa ngày.

**Hoàn thành khi:** đăng nhập Google chạy; số bước hôm nay giữ nguyên sau khi kill app, unit test pass.

### #### Ngày 4

**B: [F5] Dashboard (full-stack)**
- [ ] Tính distance, calories, active minutes từ steps + profile (dùng `useProfile()` của A, tạm dùng giá trị mặc định nếu chưa có).
- [ ] Lưu `local_activity` kèm `updated_at`, store `useTodayActivity`.
- [ ] Mobile: Dashboard (steps, goal ring, distance, calories, active minutes, trạng thái bài tập, quick-start).
- [ ] Backend: `GET /api/activities/daily`, `GET /api/activities/history` (phân trang), entity/repository `daily_activities`.

**Hoàn thành khi:** dashboard hiển thị số liệu thật; ghi Firestore từ client bị Rules chặn; API daily trả dữ liệu từ MySQL.

### #### Ngày 7: Tích hợp và buffer (nhẹ hơn)

**B: [F5, F6, F7]**
- [ ] Tinh chỉnh ngưỡng phân loại trên máy thật.
- [ ] Sửa lỗi tồn của Steps và Goals. Goals đếm "số buổi tập/tuần" từ `local_exercise` của A.
- [ ] `POST /api/activities/sync` bản đầu (chuẩn bị cho F8).
## Cross-feature interfaces

- `todayActivity` is owned by Member B and consumed by Analytics (A) and Goals (B).
- Shared interface: Zustand store `useTodayActivity` and Room table `local_activity`.


## Definition of done

- Complete the feature's listed tasks and acceptance conditions.
- Add relevant tests.
- Test on a physical Android device where the feature uses native functionality.
- Update the shared API/native/database contract before changing an interface used by the other member.
- Merge the feature branch into `dev` and request review.
