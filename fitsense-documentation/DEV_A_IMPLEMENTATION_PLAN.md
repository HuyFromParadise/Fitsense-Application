# 📋 KẾ HOẠCH HOÀN THIỆN CHI TIẾT — DEVELOPER A

> **Dự án:** FitSense Application  
> **Người thực hiện:** Developer A  
> **Phạm vi quản lý:** Features F1, F2, F3, F4 + Hạ tầng Backend & Security  
> **Tài liệu căn cứ:** `OWNERSHIP.md`, `01_PROJECT_OVERVIEW_AND_OWNERSHIP.md`, `03_SHARED_CONTRACTS_AND_HOTSPOTS.md`, `05_IMPLEMENTATION_ROADMAP.md`

---

## 1. TỔNG QUAN PHẠM VI & QUYỀN SỞ HỮU CỦA DEVELOPER A

### 1.1 Danh mục Feature phụ trách
| STT | Mã | Tên Feature | Backend (`com.example.fitsense.*`) | Mobile (`src/features/*`) | Native Kotlin (`com.fitsensemobile.*`) |
|:---:|:---:|---|---|---|---|
| 1 | **F1** | **Auth + Profile (+ Xóa tài khoản)** | `auth`, `user` | `auth`, `profile` | — |
| 2 | **F2** | **GPS Exercise** | `exercise` | `exercise` | `location` / `exercise` |
| 3 | **F3** | **Analytics** | `analytics` | `analytics` | — |
| 4 | **F4** | **FCM + Báo cáo tuần (server)** | `notification` | `notifications` | — |

### 1.2 File "Nóng" & Hợp đồng dữ liệu do A làm chủ
*   **File cấu hình bảo vệ:**
    *   `FitSenseBackend/.../config/SecurityConfig.java` & `auth/filter/FirebaseAuthenticationFilter.java` (A quản lý route công khai/bảo vệ; B muốn mở route mới phải qua A).
    *   `FitSenseMobile/src/services/api/client.ts` (Axios client gắn Bearer token, interceptor refresh và bắt lỗi 401).
    *   `Dockerfile` & `docker-compose.yml` (Hạ tầng chạy backend + MySQL).
    *   `firestore.rules` (Quy tắc bảo mật Firestore: client chỉ đọc tài liệu chính mình, cấm client ghi trực tiếp).
*   **Dữ liệu A cung cấp cho B:**
    *   `src/services/api/client.ts`: Axios client dùng chung cho toàn bộ ứng dụng Mobile.
    *   `useProfile()` hook: B cần chiều cao, cân nặng để tính khoảng cách sải chân (stride) và calo trong Dashboard (F5).
    *   Bảng Room `local_exercise`: B cần đếm "số buổi tập/tuần" để tính mục tiêu trong Goals (F7).
    *   `ExerciseSyncHandler`: Handler đồng bộ bài tập cho `SyncManager` của B.
*   **Dữ liệu A cần từ B:**
    *   `src/app/navigation/*`: Khung điều hướng Mobile để gắn màn hình của A vào.
    *   `FitSenseDatabase` (Room): Database cục bộ để lưu `local_exercise` và `local_gps_points`.
    *   `useTodayActivity` store: Đọc bước chân, calo hôm nay để tổng hợp vào Analytics (F3).

---

## 2. TRẠNG THÁI HIỆN TẠI (ĐÃ LÀM VS CÒN LẠI)

### 2.1 Đã hoàn thành (Day 1 Backend Foundation) ✅
*   [x] Khởi tạo Spring Boot 3.x (Java 21) đầy đủ dependency (Web, JPA, Security, Flyway, Validation, OpenAPI, Lombok, Firebase Admin SDK).
*   [x] Cấu trúc package chuẩn theo feature (`auth`, `user`, `exercise`, `analytics`, `notification`, `common`, `config`).
*   [x] Bộ lọc xác thực hoàn chỉnh: `FirebaseAuthenticationFilter`, `TokenVerifier`, `FirebaseTokenVerifier`, `DevTokenVerifier` (hỗ trợ `dev-token` không cần Firebase credentials).
*   [x] Security config stateless: `SecurityConfig`, `CurrentUser`, `@AuthenticatedUser`.
*   [x] Cơ chế bắt lỗi toàn cục: `GlobalExceptionHandler`, `ErrorCode`, `ApiResponse`, `ApiError`, `PageResponse`.
*   [x] Endpoints kiểm tra: `GET /api/health` và `GET /api/ping-auth`.
*   [x] Flyway `V1__init.sql`: Đã tạo các bảng của A (`users`, `user_devices`, `exercise_sessions`, `gps_points`, `exercise_metrics`).
*   [x] Placeholder Controllers (trả HTTP 501): `UserPlaceholderController`, `ExercisePlaceholderController`, `AnalyticsPlaceholderController`, `NotificationPlaceholderController`.
*   [x] Hạ tầng Docker: `Dockerfile`, `docker-compose.yml`, `application.properties`, `.env.example`.

### 2.2 Tiến độ Phase 1–3 & Phần còn lại ❌
*   [x] Backend F1 (`user`), F2 (`exercise` + `ExerciseSyncProcessor`), F3 (`analytics`) đã implement đầy đủ Entity/Repository/Service/Controller và pass 9 JUnit tests (`mvn test`). Còn lại: **F4 (Notifications/FCM)**.
*   [x] Mobile API client `src/services/api/client.ts` và Theme/Common UI.
*   [x] UI Mobile (code TypeScript, chưa chạy `npm install` / build thiết bị) cho Auth (Email/Pass, Forgot Pass), Profile (MySQL + Firestore + BMI), GPS Exercise (Tracking/History/Detail), Analytics (BarChart/LineChart + offline fallback). Còn lại: **Google Sign-In, Zod/RHF, Notification Settings (F4)**.
*   [x] Native Android Kotlin cho GPS (`com.fitsensemobile.location`): `LocationForegroundService`, `ExerciseModule`, `ExercisePackage`, `ExerciseLocalDbHelper`. Còn lại: `ExerciseSyncHandler` (tích hợp `SyncManager` của B) và test biên dịch Gradle/thiết bị.
*   [ ] F4 Backend & Mobile, MockMvc HTTP 401/403 tests, RNTL Mobile tests và kịch bản Demo tuần 2.

---

## 3. LỘ TRÌNH TRIỂN KHAI CHI TIẾT THEO NGÀY

```
                TUẦN 1
  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
  │  NGÀY 2   │    │  NGÀY 3   │    │  NGÀY 4   │    │  NGÀY 5   │    │  NGÀY 6   │    │  NGÀY 7   │
  │ F1: Auth  │───>│ F1: Auth  │───>│F1: Profile│───>│  F2: GPS  │───>│  F2: GPS  │───>│F2: Polish │
  │  (Core)   │    │  (Social) │    │  (Store)  │    │ (Native)  │    │ (Backend) │    │ & Buffer  │
  └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘
                                         TUẦN 2
  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
  │  NGÀY 8   │    │  NGÀY 9   │    │  NGÀY 10  │    │  NGÀY 11  │    │  NGÀY 12  │    │NGÀY 13-14 │
  │F2: Edges &│───>│ F2: Sync &│───>│    F3:    │───>│  F4: FCM  │───>│  Testing  │───>│ Freeze &  │
  │ Recovery  │    │F3: Weekly │    │ Analytics │    │ & Del Acc │    │& Đổi vai  │    │   Demo    │
  └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘
```

---

### NGÀY 2: [F1] AUTHENTICATION (CƠ BẢN)

#### Backend (`com.example.fitsense.user` & `auth`)
- [x] Tạo `UserEntity` (mapping bảng `users`: `id`, `firebase_uid`, `email`, `display_name`, `birth_date`, `height_cm`, `weight_kg`, `gender`, `fitness_level`, `avatar_url`).
- [x] Tạo `UserRepository` (kế thừa `JpaRepository`, hàm `findByFirebaseUid(String uid)`).
- [x] Xây dựng `UserService.getOrCreateCurrentUser(CurrentUser authUser)`:
    - Nếu `firebase_uid` đã tồn tại trong MySQL: trả về thông tin user.
    - Nếu chưa có: tự động tạo mới bản ghi user từ thông tin token (tạo UUID mới cho `id`).
- [x] Cập nhật controller thay thế placeholder: `GET /api/users/me` (`UserController.java`) trả về `ApiResponse<UserResponse>`.
- [ ] Unit Test: Kiểm tra token đúng, token sai định dạng, token hết hạn (HTTP 401/403) — *(mới có `UserServiceTest` unit test logic service, chưa viết MockMvc security filter test)*.

#### Mobile (`FitSenseMobile`)
- [x] **Viết `src/services/api/client.ts`**:
    - Khởi tạo Axios instance với `baseURL` (dev Android emulator `http://10.0.2.2:8080`, đọc `Config.API_BASE_URL` nếu có).
    - Request Interceptor: Lấy `auth().currentUser.getIdToken()` gắn vào header `Authorization: Bearer <token>`.
    - Response Interceptor: Xử lý phản hồi chuẩn và lỗi 401.
- [x] **Tạo `src/features/auth`**:
    - Màn hình `LoginScreen`: Form Email + Password, nút Submit, nút chuyển sang Register, nút Quên mật khẩu.
    - Màn hình `RegisterScreen`: Form Email + Password + Confirm Password.
    - Logic Firebase Auth: Gọi `auth().signInWithEmailAndPassword()` và `auth().createUserWithEmailAndPassword()`.
    - Lưu trạng thái Auth State vào Zustand (`useAuthStore`).
    - Gắn Auth Guard (`RootNavigator`): Nếu chưa đăng nhập chuyển hướng về `AuthStack`.
- [ ] **Tiêu chí nghiệm thu ngày 2:** Đăng nhập tài khoản thật trên app, gọi `GET /api/users/me` thành công và nhận dữ liệu JSON chuẩn *(cần cài `node_modules` & chạy app để kiểm chứng)*.

---

### NGÀY 3: [F1] AUTH MỞ RỘNG & PROFILE (GIAO DIỆN)

#### Mobile (`src/features/auth` & `src/features/profile`)
- [ ] Tích hợp Google Sign-In (`@react-native-google-signin/google-signin`).
- [x] Màn hình `ForgotPasswordScreen`: Gửi email reset pass qua Firebase `auth().sendPasswordResetEmail()`.
- [ ] Validate toàn bộ Form nhập liệu bằng thư viện **Zod** + React Hook Form *(hiện đang validate thủ công bằng React state)*.
- [x] Xây dựng màn hình `ProfileScreen`:
    - Xem và nhập: Họ tên, Giới tính, Chiều cao (cm), Cân nặng (kg), Mức độ hoạt động (`beginner`/`intermediate`/`advanced`) *(chưa gắn DatePicker cho `birthDate`)*.
    - Tự động tính chỉ số BMI: $\text{BMI} = \frac{\text{cân nặng (kg)}}{(\text{chiều cao (m)})^2}$ và hiển thị phân loại.
    - Nút Đăng xuất (`Logout`) và xóa tài khoản (`DELETE /api/users/me`).
- [ ] **Tiêu chí nghiệm thu ngày 3:** Đăng nhập được bằng Google, form validation hiển thị lỗi rõ ràng, màn hình Profile tính đúng chỉ số BMI theo thời gian thực *(chưa có Google Sign-In & chạy thực tế)*.

---

### NGÀY 4: [F1] PROFILE FULL-STACK & FIRESTORE INTEGRATION

#### Backend (`com.example.fitsense.user`)
- [x] Tạo `UserUpdateRequest` DTO (validate chiều cao 50–260cm, cân nặng 20–400kg).
- [x] Implement `PUT /api/users/me` (và `DELETE /api/users/me`):
    - Cập nhật thông tin trong bảng MySQL `users`.
    - Đồng bộ dữ liệu sang Firestore bằng Firebase Admin SDK vào document `users/{firebase_uid}/profile/main`.
    - *(Chưa ghi `users/{firebase_uid}/preferences/settings` — sẽ làm cùng F4)*.
- [x] Cấu hình Firestore Security Rules (`firestore.rules`):
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{userId}/{document=**} {
          allow read: if request.auth != null && request.auth.uid == userId;
          allow write: if false; // Chỉ Backend Admin SDK mới được quyền ghi
        }
      }
    }
    ```

#### Mobile (`src/features/profile`)
- [x] Tạo hook `useProfile()`: Lắng nghe snapshot thời gian thực từ Firestore document `users/{uid}/profile/main` (có fallback từ MySQL store).
- [ ] Hỗ trợ ảnh đại diện (avatar URL hoặc avatar mặc định theo tên) *(hiện chỉ có field `avatarUrl` ở schema/API, chưa có UI avatar trên `ProfileScreen`)*.
- [x] Cung cấp contract dữ liệu `useProfile()` cho **Developer B** để B dùng tính toán bước chân/calo trong Dashboard (F5).
- [ ] **Tiêu chí nghiệm thu ngày 4:** Thay đổi chiều cao/cân nặng trên app, backend cập nhật MySQL + Firestore; Firestore Rules chặn đứng client nếu cố tình tự ghi trực tiếp *(chưa deploy Firebase rules & test trên app)*.

---

### NGÀY 5: [F2] GPS EXERCISE — NATIVE SERVICE & LOCATION TRACKING

#### Android Native (`com.fitsensemobile.location`)
- [x] Cấu hình quyền trong `AndroidManifest.xml` & runtime request (`exerciseNative.ts`):
    - Quyền `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `POST_NOTIFICATIONS`.
    - `FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_LOCATION` (Android 14+).
- [x] Xây dựng `LocationForegroundService.kt` + `ExerciseLocalDbHelper.kt`:
    - Khởi tạo Android `LocationManager` (GPS + Network provider), notification hiển thị: "FitSense đang ghi lại buổi tập của bạn..." *(chưa gắn action button pause/stop trực tiếp trên notification)*.
    - Lấy vị trí với interval thích ứng (`CYCLING` 2s, `RUNNING` 2.5s, `WALKING` 3.5s) và lọc độ chính xác (`accuracy <= 35m`) + lọc bước nhảy tốc độ bất thường.
    - Lưu từng tọa độ nhận được trực tiếp vào SQLite local `fitsense_exercise.db` (`local_exercise`, `local_gps_points` khớp `room-schema.md`).
- [x] Xây dựng `ExerciseModule.kt` & `ExercisePackage.kt` (đã đăng ký trong `MainApplication.kt`):
    - `start(type)`, `pause()`, `resume()`, `finish()`, `getActiveSession()`, cùng helper đọc/sync offline (`getLocalExercises`, `getLocalExercisePoints`, `getPendingSyncExercises`, `markSessionSynced`).
    - Gửi event `EXERCISE_STATE` (`STARTED`, `PAUSED`, `RESUMED`, `FINISHED`, `POINT_RECORDED`) về React Native đúng `native-interface.d.ts`.
- [ ] **Tiêu chí nghiệm thu ngày 5:** Khóa màn hình điện thoại, đi bộ thực tế 200-300m, service vẫn chạy ngầm và ghi điểm liên tục vào local DB *(cần biên dịch Android & test trên thiết bị)*.

---

### NGÀY 6: [F2] GPS EXERCISE — BACKEND API & LIVE TRACKING UI

#### Backend (`com.example.fitsense.exercise`)
- [x] Tạo Entities: `ExerciseSessionEntity`, `GpsPointEntity`, `ExerciseMetricEntity`.
- [x] Tạo Repositories tương ứng (`ExerciseSessionRepository`, `GpsPointRepository`, `ExerciseMetricRepository`).
- [x] Xây dựng `ExerciseService` & `ExerciseController` (thay thế placeholder):
    - `POST /api/exercises`: Nhận session + danh sách points + metrics trong `@Transactional`, kiểm tra idempotency theo `id` UUID (trả về HTTP 200 nếu đã tồn tại, tránh trùng lặp).
    - `GET /api/exercises`: Lấy danh sách lịch sử bài tập phân trang (`Pageable`, lọc tùy chọn `type`).
    - `GET /api/exercises/{id}`: Trả về chi tiết buổi tập kèm toàn bộ tọa độ route (`ExerciseDetailResponse`).
    - `PUT /api/exercises/{id}`: Cập nhật kết thúc buổi tập hoặc đẩy thêm lô điểm GPS.

#### Mobile (`src/features/exercise`)
- [x] Màn hình `ExerciseTrackingScreen` + `useExerciseTracking`:
    - Lựa chọn loại hình: Đi bộ (`WALKING`), Chạy bộ (`RUNNING`), Đạp xe (`CYCLING`).
    - Nút Start / Pause / Resume / Finish (giữ 2 giây).
    - Bộ bấm giờ (Timer) loại trừ thời gian Pause.
    - Bản đồ trực tiếp (`react-native-maps`): Hiển thị vị trí hiện tại và vẽ Polyline đường đi thời gian thực.
    - Thẻ chỉ số real-time: Quãng đường (km - Haversine ở native service), Tốc độ (km/h), Pace trung bình (min/km), Lượng calo tiêu thụ (MET).
    - Thuật toán lọc điểm GPS ở native (`accuracy > 35m`, bỏ trôi < 2m và teleport > 45 m/s).
- [ ] **Tiêu chí nghiệm thu ngày 6:** Thực hiện một buổi chạy thật, lưu thành công lên Backend, gọi trùng API không bị nhân đôi bản ghi *(Backend đã pass `ExerciseServiceTest` idempotency, chưa chạy thực tế trên thiết bị)*.

---

### NGÀY 7: [F2] GPS EXERCISE — LỊCH SỬ, BẢN ĐỒ CHI TIẾT & BUFFER

#### Mobile (`src/features/exercise`)
- [x] Màn hình `ExerciseHistoryScreen`:
    - Danh sách bài tập phân trang theo API (lọc theo loại hình `WALKING`/`RUNNING`/`CYCLING`), gộp hiển thị các buổi tập offline chưa sync từ SQLite.
    - Thẻ tóm tắt: Loại bài tập, Ngày giờ, Quãng đường, Thời gian, Pace trung bình, badge Offline/Sync.
- [x] Màn hình `ExerciseDetailScreen`:
    - Xem lại lộ trình hoàn chỉnh trên bản đồ (`MapView`) với Polyline route, đánh dấu Start (Xanh) và Finish (Đỏ) + chỉ số chi tiết *(chưa bổ sung biểu đồ biến thiên tốc độ/pace theo thời gian)*.
- [ ] Cập nhật mô tả, ví dụ, mã lỗi chuẩn trong `fitsense-documentation/openapi.yaml` cho toàn bộ endpoint F2 *(F2 vốn đã có trong `openapi.yaml`, mới cập nhật thêm schema `PeriodAnalytics` cho F3)*.
- [ ] Hỗ trợ Developer B giải quyết các vướng mắc nếu có.
- [ ] **Tiêu chí nghiệm thu ngày 7:** Mở lại bất kỳ bài tập cũ nào đều xem được toàn bộ lộ trình vẽ mượt mà trên bản đồ *(chưa test trên app/emulator)*.

---

### NGÀY 8: [F2] GPS EXERCISE — XỬ LÝ EDGE CASES & APP RECOVERY

#### Native Kotlin & Mobile Edge Cases
- [x] Xử lý người dùng từ chối quyền Location: Hiển thị dialog giải thích rõ ràng và nút mở thẳng vào Android Settings (`Linking.openSettings()` khi `NEVER_ASK_AGAIN`).
- [ ] Xử lý khi GPS bị tắt giữa chừng: Tự động pause tracking và cảnh báo người dùng *(`LocationForegroundService.onProviderDisabled` chưa tự động pause)*.
- [x] Xử lý nhiễu/nhảy cóc tín hiệu GPS ở native: Lọc `accuracy > 35m` và teleport `> 45 m/s`.
- [x] **Xử lý sự cố app bị kill (Crash/OS kill background):**
    - `LocationForegroundService` tự khôi phục nếu bị OS restart và `useExerciseTracking` gọi `getActiveSession()` khi mở app.
    - Hiển thị hộp thoại chọn "Tiếp tục" (khôi phục điểm + timer từ SQLite) hoặc "Kết thúc ngay".
- [x] Nút Finish an toàn: Nhấn giữ 2 giây (`ExerciseTrackingScreen`).
- [x] Màn hình tóm tắt ngay sau khi kết thúc buổi tập (Summary Modal trong `ExerciseTrackingScreen`).
- [ ] **Tiêu chí nghiệm thu ngày 8:** Khóa màn hình đi bộ 15 phút liên tục; thử kill app khi đang tập và mở lại khôi phục thành công 100% dữ liệu *(chưa test thực địa)*.

---

### NGÀY 9: [F2] SYNC HANDLER & [F3] ANALYTICS (BACKEND)

#### Tích hợp Offline Sync cho Exercise (`SyncHandler`)
- [ ] Viết `ExerciseSyncHandler.kt` (phía Android) tuân thủ interface `SyncHandler` của B *(chờ Developer B dựng `SyncManager` / F8; hiện tại đã có `getPendingSyncExercises` + `markSessionSynced` trong `ExerciseModule.kt` và nút đồng bộ thủ công trong `ExerciseHistoryScreen`)*.
- [x] Viết `ExerciseSyncProcessor.java` (phía Spring Boot): Nhận payload reconcile cho `SyncController`, gọi `ExerciseService.createSession` idempotent và trả về `CREATED` / `DUPLICATE` / `CONFLICT` / `REJECTED`.
- [x] Cho phép đọc lịch sử bài tập trực tiếp từ SQLite local khi thiết bị đang offline.

#### Backend Analytics (`com.example.fitsense.analytics`)
- [x] Xây dựng `GET /api/analytics/weekly` (`AnalyticsController` + `AnalyticsService` dùng `JdbcTemplate`):
    - Tổng hợp: Tổng số bước, Bước trung bình mỗi ngày, Tổng quãng đường (m), Tổng calo, Tổng thời gian vận động (phút), Số buổi tập đã hoàn thành, `dailyBreakdown` từng ngày.
    - Xác định ngày hoạt động tích cực nhất (`bestDay`) và dữ liệu kỳ trước (`previous`) để UI tính %.
- [x] Viết script SQL `FitSenseBackend/scripts/seed_demo_data.sql` seed dữ liệu mẫu 2 tuần (daily activities, goals, GPS exercise sessions) phục vụ test và demo.
- [ ] **Tiêu chí nghiệm thu ngày 9:** Tắt kết nối mạng (Airplane mode), ghi một bài tập GPS, bật mạng lại thì app tự đồng bộ lên MySQL *(Backend `AnalyticsServiceTest` 3/3 pass; phần offline sync trên thiết bị chưa test)*.

---

### NGÀY 10: [F3] ANALYTICS FULL-STACK & BÁO CÁO THỐNG KÊ

#### Backend (`com.example.fitsense.analytics`)
- [x] Xây dựng `GET /api/analytics/monthly`: Thống kê tổng hợp theo từng tháng kèm `previous` tháng trước và `dailyBreakdown`.
- [x] Tính tỷ lệ hoàn thành mục tiêu (`goalCompletionRate` đọc bảng `goals` qua `JdbcTemplate`).

#### Mobile (`src/features/analytics`)
- [x] Màn hình `AnalyticsScreen` + `useAnalytics`:
    - Bộ lọc thời gian: Theo tuần (`Weekly`) / Theo tháng (`Monthly`) kèm điều hướng kỳ trước/sau.
    - Biểu đồ cột (`BarChart` - `react-native-gifted-charts`) cho tuần và biểu đồ đường (`LineChart`) cho tháng theo Bước / Km / Calo.
    - Thẻ so sánh trực quan so với tuần/tháng trước.
    - Thống kê tỷ lệ hoàn thành Goal (`goalCompletionRate`).
- [x] Cơ chế Offline fallback: Khi API lỗi/mất mạng, đọc tổng hợp từ `ExerciseModule` (`getLocalExercises`) và `NativeModules.LocalDbModule?.getTodayActivity` nếu có.
- [ ] **Tiêu chí nghiệm thu ngày 10:** Màn hình Analytics hiển thị biểu đồ trực quan mượt mà, đổi qua lại giữa tuần và tháng hiển thị đúng số liệu *(chưa biên dịch & test trên thiết bị)*.

---

### NGÀY 11: [F4] FCM NOTIFICATIONS & [F1] XÓA TÀI KHOẢN TOÀN DIỆN

#### Backend Notification & Account Deletion
- [ ] API `PUT /api/users/devices`: Nhận FCM device token và loại thiết bị từ Mobile, lưu vào bảng `user_devices`.
- [ ] Xây dựng `NotificationService`:
    - Tích hợp Firebase Cloud Messaging Admin SDK.
    - Phương thức `sendPushNotification(userId, title, body, dataPayload)`.
    - Bắn thông báo khi user hoàn thành mục tiêu (Goal Achieved).
- [ ] **Báo cáo tuần tự động (`@Scheduled`):**
    - Thiết lập cron job chạy vào **08:00 sáng mỗi Chủ nhật**.
    - Quét toàn bộ active users trong tuần, tổng hợp chỉ số và gửi Push Notification: *"Tuần qua bạn đã hoàn thành X bước chân và Y km. Xem ngay báo cáo tuần!"*.
- [ ] **API Xóa tài khoản (`DELETE /api/users/me`):**
    - Xóa theo thứ tự cascade: Dữ liệu GPS & Exercise trong MySQL $\rightarrow$ Toàn bộ document Firestore của user $\rightarrow$ Xóa user record trong Firebase Authentication.

#### Mobile Notification & Settings
- [ ] Cấu hình lắng nghe FCM Push Notification khi app đang mở (Foreground) và khi app đang đóng (Background/Quit state).
- [ ] Màn hình `NotificationSettingsScreen`: Bật/tắt nhận báo cáo tuần, nhắc nhở bài tập.
- [ ] Thêm nút **"Xóa tài khoản vĩnh viễn"** trong `ProfileScreen`:
    - Hộp thoại cảnh báo mức độ nguy hiểm, yêu cầu người dùng xác nhận.
    - Sau khi xóa thành công: Tự động clear session cục bộ và đưa về màn hình chào đón.
- [ ] **Tiêu chí nghiệm thu ngày 11:** Gửi được FCM test về máy thật; bấm xóa tài khoản thì toàn bộ dữ liệu trên MySQL, Firestore và Auth bị dọn sạch.

---

### NGÀY 12: KIỂM THỬ TOÀN DIỆN & THỬ NGHIỆM ĐỔI VAI (CROSS-TEST)

#### Kiểm thử đơn vị & tích hợp (Unit & Integration Test)
- [ ] **Backend Test (JUnit 5 + Mockito):**
    - `AuthFilterTest`: Kiểm tra các trường hợp không token, token hết hạn, sai chữ ký, token dev.
    - `UserServiceTest`: Test tạo user mới tự động, cập nhật profile, xóa tài khoản.
    - `ExerciseServiceTest`: Test tạo session mới, kiểm tra Idempotency khi gửi trùng UUID, transaction rollback nếu insert GPS point lỗi.
    - `AnalyticsServiceTest`: Test tính toán số liệu tuần/tháng với các trường hợp biên (không có dữ liệu, dữ liệu nhảy vọt).
- [ ] **Mobile Test (React Native Testing Library):**
    - Test form nhập liệu đăng nhập/đăng ký.
    - Test các trạng thái hiển thị của nút điều khiển Tracking.

#### Thử nghiệm đổi vai (BẮT BUỘC)
- [ ] A dùng thiết bị của mình, đăng nhập tài khoản khác và tìm cách **phá feature của B**:
    - Thử đi bộ xem bộ đếm bước của B có đếm sai không.
    - Thử reboot máy xem bước chân của B có bị reset về 0 không.
    - Thử tạo goal trùng lặp.
- [ ] **Kiểm tra cách ly dữ liệu tuyệt đối (AC-13):**
    - Dùng Tài khoản 1 kiểm tra xem có cách nào xem hoặc sửa được bài tập, profile, goal của Tài khoản 2 không.
- [ ] Rà soát danh sách lỗi phát hiện được, ghi nhận vào `BUGS.md`.
- [ ] **Tiêu chí nghiệm thu ngày 12:** Toàn bộ test suite `mvn test` màu xanh, không có lỗi rò rỉ dữ liệu giữa 2 tài khoản.

---

### NGÀY 13: ĐÓNG BĂNG TÍNH NĂNG (FEATURE FREEZE) & HOÀN THIỆN INFRA

- [ ] **ĐÓNG BĂNG TÍNH NĂNG:** Từ 08:30 sáng, không viết thêm bất kỳ tính năng mới nào. Chỉ tập trung sửa lỗi và tối ưu.
- [ ] **Hoàn thiện hạ tầng Docker Backend:**
    - Cấu hình `Dockerfile` nhiều giai đoạn (Multi-stage build) để tối ưu dung lượng image.
    - Kiểm tra `docker-compose up` chạy ổn định cả MySQL 8.4 và Spring Boot backend trên môi trường máy sạch.
    - Kiểm tra file biến môi trường mẫu `.env.example`.
- [ ] Bật Spring Boot Actuator (`/actuator/health`, `/actuator/metrics`), cấu hình structured logging.
- [ ] Triển khai và xác minh lần cuối `firestore.rules` trên Firebase Console.
- [ ] Soạn thảo và hoàn thiện tài liệu theo phân công trong `06_DEMO_ACCEPTANCE_AND_RELEASE.md`:
    - `API_SPECIFICATION.md` (xuất từ Swagger/OpenAPI).
    - Phần tài liệu liên quan đến Auth, GPS Tracking, Analytics, Notification trong `PROJECT_REQUIREMENTS.md`.

---

### NGÀY 14: TỔNG DUYỆT DEMO & PHÒNG NGỪA RỦI RO

- [ ] Chuẩn bị kịch bản Demo trực tiếp cho các phần của A:
    1. Demo Đăng ký/Đăng nhập (Google Sign-In + Email/Password).
    2. Demo Profile và tính chỉ số BMI tự động.
    3. Demo Bắt đầu một bài tập chạy bộ: Bật GPS tracking, khóa màn hình điện thoại, di chuyển thực tế.
    4. Demo Khôi phục bài tập: Cố tình kill app trong lúc đang tracking, mở lại app và khôi phục thành công.
    5. Demo Kết thúc bài tập: Xem lộ trình vẽ trên bản đồ chi tiết, lưu dữ liệu lên server.
    6. Demo Màn hình Analytics: Biểu đồ tuần, tỷ lệ tăng trưởng.
    7. Demo Nhận thông báo FCM push notification.
    8. Demo Xóa tài khoản vĩnh viễn dọn sạch dữ liệu.
- [ ] **Kế hoạch dự phòng rủi ro:**
    - Quay sẵn 01 video clip chất lượng cao quay lại toàn bộ màn hình tracking GPS ngoài trời (đề phòng phòng thuyết trình bị mất sóng GPS).
    - Chuẩn bị sẵn 01 tài khoản demo đã seed sẵn dữ liệu hoạt động 14 ngày.
    - Chuẩn bị điện thoại pin đầy 100%, có kết nối 4G/5G ổn định.
- [ ] Gắn git tag chính thức: `v1.0-release`.

---

## 4. CHECKLIST HỢP ĐỒNG KỸ THUẬT VỚI DEVELOPER B

Khi làm việc hàng ngày, Developer A phải tuân thủ nghiêm ngặt các quy tắc giao tiếp sau:

| Đối tượng | Trách nhiệm của A | Trách nhiệm của B |
|---|---|---|
| **API Client** | Viết xong `src/services/api/client.ts` ngay Ngày 2 để B có công cụ gọi API. | Dùng chung `client.ts`, không tự tạo axios instance riêng. |
| **Profile Data** | Cung cấp hook `useProfile()` chứa `height_cm` và `weight_kg`. | Dùng `useProfile()` để tính stride/calories; có fallback mặc định nếu user chưa nhập. |
| **Exercise Data** | Ghi đầy đủ buổi tập vào bảng Room `local_exercise` kèm cờ `is_completed`. | Đọc từ `local_exercise` để tính tiến độ mục tiêu "Số buổi tập/tuần" cho Goal (F7). |
| **Sync Handler** | Viết `ExerciseSyncHandler` khớp interface `SyncHandler` do B định nghĩa. | `SyncManager` của B gọi `ExerciseSyncHandler` khi có mạng. |
| **Security Config** | A là người duy nhất sửa `SecurityConfig.java`. Nếu B cần route public, B phải báo A mở. | B không tự ý chỉnh sửa file cấu hình bảo mật. |
| **Git Branches** | Làm việc trên nhánh `feature/f1-auth`, `feature/f2-gps`, v.v. Rebase `dev` mỗi sáng. | Rebase `dev` mỗi sáng, merge vào `main` thông qua Pull Request có review chéo. |

---

## 5. NGUYÊN TẮC "THỬ LÀ ĐẠT" (ACCEPTANCE CRITERIA CỦA A)

Trước khi đánh dấu hoàn thành bất kỳ task nào, A cần tự kiểm tra theo các tiêu chí nghiệm thu tương ứng trong `06_DEMO_ACCEPTANCE_AND_RELEASE.md`:
*   **AC-01 (Auth):** Đăng ký, đăng nhập email/password và Google thành công; token hết hạn tự logout.
*   **AC-02 (Profile):** Cập nhật chiều cao/cân nặng cập nhật đồng thời MySQL + Firestore; client ghi trực tiếp Firestore bị từ chối.
*   **AC-04 (GPS Live Tracking):** Khóa màn hình 15 phút ngoài trời, service vẫn ghi điểm đều đặn; app bị kill mở lại khôi phục được buổi tập.
*   **AC-05 (Exercise Idempotency):** Gọi `POST /api/exercises` 2 lần với cùng UUID chỉ tạo ra đúng 1 buổi tập duy nhất trên server.
*   **AC-08 (Analytics):** Biểu đồ hiển thị đúng số liệu thật hoặc seed data; mất mạng vẫn xem được số liệu offline từ Room.
*   **AC-10 (FCM):** Nhận được thông báo đẩy trên thiết bị thật.
*   **AC-13 (Data Isolation):** Tuyệt đối không xem/sửa được dữ liệu của tài khoản khác.
*   **AC-14 (Delete Account):** Xóa tài khoản xóa sạch MySQL, Firestore và Firebase Auth.
