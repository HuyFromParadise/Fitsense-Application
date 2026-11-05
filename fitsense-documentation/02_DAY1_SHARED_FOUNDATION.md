## 3. Ngày 1: Dựng bộ khung

**Mục tiêu:** cuối ngày có một **"walking skeleton"** gồm app mở trên máy thật, đi qua đủ các tab (màn hình placeholder), gọi được `GET /api/health` tới backend đang chạy bằng Docker, và hiển thị kết quả trên màn hình. Mọi feature sau này chỉ việc "đổ ruột" vào khung này.

### 3.1 Lịch trong ngày

| Giờ | Việc | Ai |
|---|---|---|
| 08:30-09:00 | Chốt phiên bản công cụ: JDK 21, Node LTS, React Native, Android SDK/target SDK, Gradle, Kotlin | Cả hai |
| 09:00-10:30 | Tạo repo, Firebase project, Google Maps key (mục 3.2) | Cả hai |
| 10:30-12:00 | Soạn và chốt **4 giao ước** bằng AI rồi đọc lại (mục 3.3) | Cả hai |
| 13:00-16:30 | Dựng khung: A làm **backend skeleton**, B làm **mobile skeleton** (mục 3.4, 3.5) | A / B |
| 16:30-17:30 | **Đổi vai kiểm tra chéo:** A chạy app của B trên máy mình, B chạy backend bằng Docker của A. Xử lý lỗi môi trường | Cả hai |
| 17:30-18:00 | Retro, gắn tag `skeleton-v0`, ghi kế hoạch ngày 2 | Cả hai |

### 3.2 Hạ tầng dùng chung (sáng)

- [ ] Tạo monorepo:

```
FitSense/
├── fitsense-mobile/
├── fitsense-backend/
├── fitsense-documentation/
│   ├── openapi.yaml
│   ├── native-interface.d.ts      (bản chính, mobile import từ đây hoặc copy)
│   ├── room-schema.md
│   └── OWNERSHIP.md               (bảng feature, người, thư mục)
├── docker-compose.yml
├── .env.example
├── BUGS.md
└── README.md
```

- [ ] Git: nhánh `main` (luôn chạy được), `dev`, `feature/<tên-feature>`. Bật bảo vệ nhánh `main`, merge bằng PR.
- [ ] Firebase: bật Email/Password và Google Sign-In, tạo Firestore, thêm app Android (SHA-1 của **cả hai máy**, vì mỗi người có debug keystore riêng), tải `google-services.json`, tạo service account cho backend (không commit file này).
- [ ] Google Maps API key (Maps SDK for Android), giới hạn package name và SHA-1.
- [ ] `.gitignore` chặn: `google-services.json` bản thật nếu chứa key riêng, service account JSON, `.env`, keystore.
- [ ] Thống nhất tên package Android: `com.fitsensemobile`, và tên applicationId.

### 3.3 Bốn giao ước cần chốt

"Giao ước" (contract) là bản thỏa thuận về cách hai phần code nói chuyện với nhau. Vì giờ mỗi người làm cả hai tầng, giao ước quan trọng nhất là giữa **hai người** (feature của người này dùng dữ liệu của người kia).

1. **OpenAPI (`openapi.yaml`):** liệt kê **toàn bộ endpoint** của đặc tả ngay từ ngày 1, kể cả những cái chưa làm. Ghi sẵn DTO và mã lỗi. Đây là bản đồ chung.
2. **Native interface (`.d.ts`):** tên module, method, event, payload cho `StepCounter`, `MotionSensor`, `Exercise`, `LocalDb`, `Notification`.
3. **Schema Room + Flyway MySQL V1:** **tất cả bảng** tạo từ ngày 1 (kể cả bảng của feature chưa làm) để tránh hai người cùng sửa migration.
4. **Hợp đồng dữ liệu giữa hai người** (bảng dưới).

**Hợp đồng dữ liệu giữa A và B (chốt trong `OWNERSHIP.md`):**

| Dữ liệu | Chủ sở hữu | Người dùng | Giao diện |
|---|---|---|---|
| `todayActivity` (steps, distance, calories, activeMinutes) | B (F5) | A (Analytics), B (Goals) | Zustand store `useTodayActivity` + bảng `local_activity` |
| `local_exercise`, `local_gps_points` | A (F2) | B (Sync, Goals đếm số buổi tập) | Bảng Room + DAO |
| Profile (chiều cao, cân nặng) | A (F1) | B (tính stride, calories) | Hook `useProfile()` đọc từ Firestore |
| Goals (mục tiêu) | B (F7) | A (Analytics: tỷ lệ hoàn thành) | API `/api/goals` + hook `useGoals()` |
| `SyncHandler` | Từng feature | B (SyncManager) | Interface ở mục 5 |
| Token đăng nhập | A (F1) | Mọi người | Axios client đã gắn token |

**Quy tắc:** nếu cần đổi giao ước thì báo người kia trước và sửa trong `fitsense-documentation`, không sửa lặng lẽ.

### 3.4 Backend skeleton (A, buổi chiều)

- [ ] Spring Boot (Java 21, Maven): Web, Security, JPA, Validation, MySQL, Flyway, springdoc, Actuator, Lombok/MapStruct, Firebase Admin SDK, Testcontainers (hoặc H2) và JUnit 5/Mockito cho test.
- [ ] Cấu trúc package **theo feature** (đúng đặc tả):

```
com.fitsense
├── auth/            (Firebase filter, SecurityConfig)
├── user/            controller, service, repository, entity, dto
├── activity/
├── exercise/
├── goal/
├── analytics/
├── sync/
├── notification/
├── config/          (Firebase, OpenAPI, CORS, Jackson, Clock)
├── common/
│   ├── exception/   (GlobalExceptionHandler, ErrorCode)
│   ├── response/    (ApiResponse, PageResponse)
│   ├── security/    (CurrentUser, @AuthenticatedUser)
│   └── base/        (BaseEntity: id UUID, createdAt, updatedAt)
└── FitsenseApplication.java
```

- [ ] **Flyway `V1__init.sql`:** tạo **toàn bộ** bảng MySQL (`users`, `user_devices`, `daily_activities`, `exercise_sessions`, `gps_points`, `exercise_metrics`) kèm foreign key, unique constraint (`id` từ client, `user_id + activity_date`), index.
- [ ] Filter Firebase token ở dạng **khung**: đọc header `Authorization: Bearer`, verify bằng Admin SDK, gán `CurrentUser`. Cho phép bật profile `dev` có token giả để test nhanh.
- [ ] `GlobalExceptionHandler` + định dạng lỗi chung (`code`, `message`, `details`, `timestamp`).
- [ ] `GET /api/health` (công khai) và `GET /api/ping-auth` (yêu cầu token) để kiểm tra khung.
- [ ] `docker-compose.yml` (MySQL + backend, healthcheck, volume), `application.yml` đọc secret từ biến môi trường, `.env.example`.
- [ ] Swagger UI chạy được, OpenAPI skeleton khớp `openapi.yaml`.
- [ ] Mỗi feature có **package rỗng kèm controller trả 501** (Not Implemented) để route đã tồn tại.

### 3.5 Mobile skeleton (B, buổi chiều)

- [ ] React Native CLI + TypeScript, chạy được trên **máy thật**.
- [ ] Cài toàn bộ thư viện **một lần duy nhất** (tránh hai người cùng sửa `package.json` và `build.gradle`): React Navigation, Zustand, TanStack Query, Axios, React Native Firebase (app, auth, firestore, messaging), Maps, Geolocation Service, Permissions, NetInfo, Gifted Charts, Zod, một thư viện form.
- [ ] **Khai báo trước toàn bộ quyền** trong `AndroidManifest.xml`: `ACTIVITY_RECOGNITION`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `INTERNET`, `ACCESS_NETWORK_STATE`, kèm khai báo service/receiver rỗng sẽ dùng sau.
- [ ] Cấu trúc thư mục **theo feature**:

```
src/
├── app/
│   ├── navigation/      (RootNavigator, AuthStack, MainTabs, types)
│   └── providers/       (QueryProvider, AuthProvider, ThemeProvider)
├── features/
│   ├── auth/            screens, components, api, hooks, store
│   ├── profile/
│   ├── steps-dashboard/
│   ├── sensors/
│   ├── exercise/
│   ├── goals/
│   ├── analytics/
│   ├── sync/
│   └── notifications/
├── components/          (common, charts, cards: Button, Input, Card, EmptyState, ErrorState, Loading)
├── services/
│   ├── api/             (axios client, interceptor, error mapper)
│   ├── firebase/
│   ├── native/          (wrapper TypeScript cho từng native module, kèm mock cho iOS/test)
│   └── sync/
├── hooks/  stores/  types/  utils/  theme/
```

- [ ] Navigation: Auth stack (Login, Register, ResetPassword) + Main tabs (Dashboard, Exercise, Analytics, Goals, Profile) + màn Sensor Monitor. **Mọi màn là placeholder** có tên, route và kiểu tham số đã khai báo.
- [ ] Axios client: baseURL theo môi trường, interceptor gắn token (khung), chuẩn hóa lỗi. Dùng `adb reverse tcp:8080 tcp:8080` để máy thật gọi được backend chạy trên laptop.
- [ ] Theme và bộ component dùng chung (màu, spacing, Button, Card, Loading, Error, Empty).
- [ ] **Khung native (Android, Kotlin):**

```
android/app/src/main/java/com/fitsense/
├── FitSensePackage.kt        (đăng ký TẤT CẢ module ngay từ đầu)
├── common/                   (EventEmitter helper, PermissionHelper, TimeUtils)
├── database/                 (FitSenseDatabase với TẤT CẢ entity + DAO rỗng, LocalDbModule)
├── steps/                    (StepCounterModule: stub)
├── sensors/                  (MotionSensorModule: stub)
├── location/                 (ExerciseModule, LocationForegroundService: stub)
├── sync/                     (SyncModule: stub, SyncHandler interface)
└── notification/             (NotificationModule: stub, channels)
```

  Mỗi module stub trả về dữ liệu giả (ví dụ `getTodaySteps()` trả 0) để người làm UI không bị chặn.
- [ ] **Room:** tạo sẵn `FitSenseDatabase` chứa **cả 6 bảng** (`local_activity`, `local_exercise`, `local_gps_points`, `sync_queue`, `step_snapshots`, `sensor_samples`) và DAO khung. Nếu Room/KSP lỗi quá nửa ngày thì chuyển sang `SQLiteOpenHelper` thuần Kotlin.
- [ ] Zustand store khung: `useAuthStore`, `useTodayActivity`, `useSyncStatus`.

### 3.6 Kiểm tra chéo cuối ngày (16:30-17:30)

| Kiểm tra | Người kiểm | Đạt |
|---|---|---|
| `docker compose up` chạy được backend + MySQL trên máy kia | B | ☐ |
| `GET /api/health` trả 200, Swagger UI mở được | B | ☐ |
| Clone repo mới, `npm install` và build chạy trên máy thật của mình | A | ☐ |
| App đi qua đủ các tab, màn Sensor Monitor mở được | A | ☐ |
| App gọi `/api/health` qua `adb reverse`, hiển thị kết quả trên màn hình | Cả hai | ☐ |
| Mỗi module native stub gọi được từ JS (trả giá trị giả) | A | ☐ |
| Flyway V1 chạy sạch trên DB mới, tạo đủ bảng | B | ☐ |
| Không có secret nào bị commit | Cả hai | ☐ |

**Hoàn thành ngày 1 khi:** tất cả mục trên đạt, tag `skeleton-v0` đã gắn, mỗi người đã tạo nhánh `feature/...` đầu tiên của mình.

---
