## 6. Lộ trình theo ngày (chia theo feature)

Ký hiệu: **[F#]** là feature, xem bảng mục 2.

### Tuần 1

#### Ngày 1: Bộ khung
Xem mục 3.

#### Ngày 2

**A: [F1] Auth (phần 1, full-stack)**
- [ ] Backend: hoàn thiện filter xác thực (verify chữ ký, audience, hết hạn), `GET /api/users/me` tự tạo user lần đầu theo `firebase_uid`.
- [ ] Mobile: màn Register, Login, Logout bằng email/password, lưu trạng thái đăng nhập, Axios interceptor lấy ID token mới nhất, auth guard, xử lý 401.
- [ ] Test: token đúng/sai/hết hạn, `ping-auth`.

**B: [F5] Steps (phần 1, native)**
- [ ] Native: `StepCounterModule` thật: kiểm tra phần cứng, xin quyền `ACTIVITY_RECOGNITION`, listener theo lifecycle, emit event. Trạng thái `UNAVAILABLE`/`DENIED`.
- [ ] Mobile: hook `useStepCounter`, màn tạm hiển thị số bước thô và trạng thái quyền.
- [ ] Room: `step_snapshots` DAO thật.

**Hoàn thành khi:** A đăng nhập thật và `users/me` trả đúng; B thấy số bước thô trên máy thật.

#### Ngày 3

**A: [F1] Auth (phần 2)**
- [ ] Google Sign-In, Reset password, validate form (Zod).
- [ ] Màn Profile: chỉnh họ tên, ngày sinh, chiều cao, cân nặng, giới tính (tùy chọn), mức fitness, tính BMI.

**B: [F5] Steps (phần 2, logic baseline)**
- [ ] `bước hôm nay = counter hiện tại − counter lúc 00:00 giờ địa phương`, phát hiện reboot bằng `BOOT_COUNT` hoặc counter nhỏ hơn snapshot, giữ bước trước reboot.
- [ ] `StepSnapshotWorker` (WorkManager ~15 phút) và `BootReceiver`.
- [ ] Chốt ngày hôm trước khi người dùng không mở app. Restart app không đếm trùng.
- [ ] **Unit test thuần Kotlin:** reboot, qua ngày, bỏ qua nhiều ngày, counter reset giữa ngày.

**Hoàn thành khi:** đăng nhập Google chạy; số bước hôm nay giữ nguyên sau khi kill app, unit test pass.

#### Ngày 4

**A: [F1] Profile (phần 2, full-stack)**
- [ ] Backend: `PUT /api/users/me` (validate chiều cao, cân nặng, ngày sinh), ghi Firestore `users/{uid}/profile/main` và `preferences/settings` bằng Admin SDK.
- [ ] Firestore Security Rules: chỉ đọc tài liệu của mình, client không ghi.
- [ ] Mobile: đọc profile bằng Firestore snapshot, ảnh đại diện (hoặc avatar mặc định), hook `useProfile()` cho B dùng.
- [ ] Test Rules: client ghi bị từ chối, đọc tài liệu người khác bị từ chối.

**B: [F5] Dashboard (full-stack)**
- [ ] Tính distance, calories, active minutes từ steps + profile (dùng `useProfile()` của A, tạm dùng giá trị mặc định nếu chưa có).
- [ ] Lưu `local_activity` kèm `updated_at`, store `useTodayActivity`.
- [ ] Mobile: Dashboard (steps, goal ring, distance, calories, active minutes, trạng thái bài tập, quick-start).
- [ ] Backend: `GET /api/activities/daily`, `GET /api/activities/history` (phân trang), entity/repository `daily_activities`.

**Hoàn thành khi:** dashboard hiển thị số liệu thật; ghi Firestore từ client bị Rules chặn; API daily trả dữ liệu từ MySQL.

#### Ngày 5

**A: [F2] GPS Exercise (phần 1: native)**
- [ ] Quyền location (foreground; background chỉ khi thật cần, có giải thích).
- [ ] `LocationForegroundService` (Fused Location, kênh notification riêng, `foregroundServiceType="location"`), ghi điểm vào `local_gps_points` bằng Kotlin.
- [ ] `ExerciseModule`: `start(type)`, `pause()`, `resume()`, `finish()`, `getActiveSession()`.
- [ ] Test thực địa: khóa màn hình, đi vài trăm mét.

**B: [F7] Goals (full-stack)**
- [ ] Backend: `POST/GET/PUT/DELETE /api/goals` (steps ngày, distance ngày, calories ngày, thời gian tập tuần, số buổi tập tuần), ghi Firestore `users/{uid}/goals/{goalId}`, validate và kiểm tra quyền sở hữu.
- [ ] Mobile: màn Goals (tạo/sửa/xóa), thanh tiến độ tính từ `useTodayActivity`, màn lịch sử goal đã đạt.
- [ ] Test: CRUD, người dùng khác không sửa được goal của mình.

**Hoàn thành khi:** service GPS chạy khi khóa màn hình; goal progress thay đổi theo bước thật.

#### Ngày 6

**A: [F2] GPS Exercise (phần 2: backend + tracking UI)**
- [ ] Backend: `POST/GET/PUT /api/exercises`, `GET /api/exercises/{id}`, lưu session + gps_points + metrics trong **một transaction**, unique theo UUID (trùng thì trả bản đã có), validate lat/lng/timestamp, batch insert, phân trang.
- [ ] Mobile: màn tracking (chọn loại, Start/Pause/Resume/Finish, timer, live map, distance, pace, speed).
- [ ] Lọc điểm GPS xấu, Haversine, calories theo MET.

**B: [F6] Sensors (full-stack native + UI)**
- [ ] `MotionSensorModule`: accelerometer + gyroscope, `SENSOR_DELAY_UI`, hủy listener khi ra nền, throttle event ~10-20 Hz.
- [ ] Màn Sensor Monitor: X/Y/Z real-time, số bước, nhãn chuyển động, biểu đồ nhỏ.
- [ ] Phân loại theo ngưỡng trên cửa sổ trượt ~2 giây (độ lệch chuẩn của độ lớn gia tốc), ngưỡng nằm trong file cấu hình.
- [ ] (Tùy chọn) Bảng `sensor_samples` để ghi mẫu phục vụ chỉnh ngưỡng.

**Hoàn thành khi:** A chạy trọn một buổi tập và lưu lên server được, gọi trùng UUID không tạo bản thứ hai; B thấy nhãn đổi đúng khi đứng yên/đi/chạy.

#### Ngày 7: Tích hợp và buffer (nhẹ hơn)

**A: [F2]**
- [ ] Pause/resume đúng (không tính khoảng tạm dừng).
- [ ] Màn Exercise History (phân trang) và Exercise Detail (polyline route).
- [ ] Swagger: rà mô tả, ví dụ, mã lỗi cho feature của A.

**B: [F5, F6, F7]**
- [ ] Tinh chỉnh ngưỡng phân loại trên máy thật.
- [ ] Sửa lỗi tồn của Steps và Goals. Goals đếm "số buổi tập/tuần" từ `local_exercise` của A.
- [ ] `POST /api/activities/sync` bản đầu (chuẩn bị cho F8).

**Cả hai:** demo nội bộ, rà `BUGS.md`, hỗ trợ nhau nếu ai còn nợ.

> **Mốc tuần 1:** Auth + Profile + Steps/Dashboard + Goals + Sensor Monitor chạy trên máy thật; GPS Exercise ghi được route và lưu lên server.

### Tuần 2

#### Ngày 8

**A: [F2] GPS Exercise (edge case)**
- [ ] Quyền bị từ chối (hướng dẫn mở Settings), GPS tắt, mất tín hiệu (đánh dấu đoạn thiếu), chuyển app, tắt màn hình.
- [ ] **App bị kill:** mở lại đọc `getActiveSession()` từ Room, hỏi tiếp tục hay kết thúc.
- [ ] Hộp thoại xác nhận Finish (giữ nút 2 giây), màn tóm tắt sau buổi tập.
- [ ] Đi thử ngoài đường với màn hình khóa ít nhất 15 phút.

**B: [F8] Offline Sync (lõi client)**
- [ ] `sync_queue` DAO, `SyncManager`: NetInfo phát hiện mạng, hàng đợi, retry **exponential backoff + jitter**, chỉ chuyển `SYNCED` sau khi server xác nhận, không xóa local trước đó.
- [ ] Interface `SyncHandler` (mục 5), cơ chế đăng ký handler.
- [ ] Trạng thái sync trong UI (số bản ghi chờ, biểu tượng đồng bộ), store `useSyncStatus`.

**Hoàn thành khi:** buổi tập bị kill giữa chừng khôi phục được; SyncManager chạy với một handler giả.

#### Ngày 9

**A: [F2] Sync handler cho Exercise + [F3] Analytics bắt đầu**
- [ ] `ExerciseSyncHandler` (Kotlin) + `ExerciseSyncProcessor` (Spring): lô GPS (~500 điểm, có số thứ tự lô), upsert theo UUID, trong transaction.
- [ ] Lịch sử bài tập đọc từ Room khi offline.
- [ ] Backend Analytics: `GET /api/analytics/weekly` (tổng bước, trung bình ngày, tổng quãng đường chạy, tổng thời gian, số buổi, ngày hoạt động nhiều nhất, so tuần trước).
- [ ] Script seed dữ liệu mẫu cho test.

**B: [F8] Sync (server + handler Daily Activity)**
- [ ] `POST /api/sync/reconcile`: xử lý từng mục độc lập, trả `CREATED`/`DUPLICATE`/`CONFLICT`/`REJECTED` kèm lý do. Cập nhật `user_devices.last_sync_at`.
- [ ] `DailyActivitySyncHandler` + processor, đẩy theo `activity_date` + `timezone_id`.
- [ ] Quy tắc conflict: exercise server thắng; daily summary bản `updated_at` mới hơn thắng; profile/goals last-write-wins.
- [ ] Test gọi trùng nhiều lần, lô bị ngắt giữa chừng.

**Hoàn thành khi:** tắt Wi-Fi và dữ liệu di động, ghi buổi tập, bật lại thì server nhận đúng **một** bản.

#### Ngày 10

**A: [F3] Analytics (full-stack)**
- [ ] `GET /api/analytics/monthly`, tỷ lệ hoàn thành goal (đọc goals của B qua Admin SDK).
- [ ] Màn Analytics: bộ lọc ngày/tuần/tháng, biểu đồ steps, distance, calories, duration (gifted-charts), thẻ so sánh tuần, thống kê goal.
- [ ] Đọc dữ liệu từ Room khi offline.

**B: [F8] Sync (hoàn thiện)**
- [ ] Kịch bản kiểm thử end-to-end: offline → ghi → online → sync, gọi sync hai lần, mất mạng giữa lúc sync, kill app giữa lúc sync.
- [ ] Xử lý `FAILED` và thử lại, thông báo lỗi sync (tùy chọn).
- [ ] Kiểm thử reboot cho Steps.

**Hoàn thành khi:** AC-10, 11, 12 đạt; biểu đồ tuần/tháng hiển thị dữ liệu thật hoặc seed.

#### Ngày 11

**A: [F4] FCM + [F1] Xóa tài khoản**
- [ ] Đăng ký device token (`user_devices`), `NotificationService`, thông báo hoàn thành goal, **báo cáo tuần** (`@Scheduled` mỗi sáng Chủ nhật), xử lý token hết hạn.
- [ ] Màn Notification settings.
- [ ] Endpoint **xóa tài khoản**: xóa MySQL (cascade), Firestore, Firebase Auth user; màn xác nhận trong Profile.

**B: [F9] Local notification + tối ưu pin**
- [ ] WorkManager + NotificationManager: nhắc đạt bước hằng ngày, nhắc ít vận động (trong khung giờ cho phép), thông báo hoàn thành bài tập.
- [ ] Tối ưu pin: interval GPS thích ứng (2-5 giây khi chạy, dài hơn khi đứng yên), `PRIORITY_BALANCED` khi phù hợp, hủy sensor khi không cần.
- [ ] Đo mức pin hao trong 30 phút tracking.

**Hoàn thành khi:** nhận được FCM trên máy thật; thông báo local đúng giờ; xóa tài khoản xóa sạch dữ liệu.

#### Ngày 12: Kiểm thử (mỗi người test feature của mình, rồi test chéo)

**A:**
- [ ] Backend (JUnit 5 + Mockito): Auth 401/403, profile, exercise (tạo/hoàn thành/trùng/GPS sai), analytics, xóa tài khoản.
- [ ] Frontend (React Native Testing Library): form auth, điều hướng, màn tracking.
- [ ] Test tay: GPS khóa màn hình, kill app, quyền bị từ chối.

**B:**
- [ ] Backend: goals CRUD, daily activities, sync/reconcile (trùng, conflict).
- [ ] Android/Kotlin test: baseline step, bộ phân loại, SyncManager (retry/backoff).
- [ ] Test tay: reboot, sensor không khả dụng, mất mạng giữa lúc sync, goal progress.

**Test chéo (bắt buộc):** mỗi người thử **phá** feature của người kia, đặc biệt **cô lập dữ liệu giữa hai tài khoản** (AC-13): tài khoản 1 không đọc/sửa được exercise, goal, profile của tài khoản 2.

**Hoàn thành khi:** `mvn test` xanh, lỗi P0 đã sửa, danh sách lỗi còn lại đã xếp ưu tiên.

#### Ngày 13: Đóng băng tính năng, Docker, tài liệu

Từ sáng **không thêm tính năng**, chỉ sửa lỗi. Mỗi người viết tài liệu cho **feature của mình** (cả backend, native, mobile), nên tài liệu cũng chia theo feature.

**A:**
- [ ] Dockerfile backend (multi-stage), `docker-compose` hoàn chỉnh, `.env.example`.
- [ ] Triển khai Firestore Rules production, kiểm tra lại.
- [ ] Tài liệu: `PROJECT_REQUIREMENTS`, `SYSTEM_ARCHITECTURE`, `API_SPECIFICATION` (xuất từ Swagger), `SECURITY`, phần Auth/Exercise/Analytics/FCM trong các tài liệu liên quan.
- [ ] Structured logging, Actuator.

**B:**
- [ ] Build APK release (keystore, minify), thử cài sạch trên máy thật.
- [ ] Tài liệu: `MOBILE_ARCHITECTURE`, `NATIVE_ANDROID_FEATURES`, `OFFLINE_SYNC` (có sơ đồ luồng), `DATABASE_DESIGN` (ERD), `TESTING`, `IMPLEMENTATION_ROADMAP`.
- [ ] Seed dữ liệu mẫu cho demo.

**Cả hai:** kịch bản demo, đối chiếu AC-01 đến AC-14.

#### Ngày 14: Diễn tập và dự phòng

- [ ] Diễn tập demo 2-3 lần, bấm giờ.
- [ ] Quay video backup cho 3 phần demo.
- [ ] Máy dự phòng, pin đầy, đã đăng nhập sẵn tài khoản demo.
- [ ] Chỉ sửa lỗi nghiêm trọng, đóng băng `main`, gắn tag `v1.0`.
- [ ] Chuẩn bị trả lời: vì sao dùng 3 nơi lưu dữ liệu, xử lý reboot, idempotency, conflict, độ chính xác sensor.
- [ ] **Chia phần thuyết trình theo feature:** mỗi người trình bày đúng feature mình làm.

---
