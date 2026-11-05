# OWNERSHIP — feature, người, thư mục, hợp đồng dữ liệu

Cập nhật file này khi đổi **hợp đồng dữ liệu** hoặc đổi người phụ trách. Không sửa lặng lẽ.

## Phân chia feature

| # | Feature | Người | Backend (`com.fitsense.*`) | Mobile (`src/features/*`) | Native (`android/.../com/fitsense/*`) |
|---|---|---|---|---|---|
| F1 | Auth + Profile (+ xóa tài khoản) | A | `auth`, `user` | `auth`, `profile` | — |
| F2 | GPS Exercise | A | `exercise` | `exercise` | `location` |
| F3 | Analytics | A | `analytics` | `analytics` | — |
| F4 | FCM + báo cáo tuần (server) | A | `notification` | `notifications` | — |
| F5 | Steps + Dashboard | B | `activity` | `steps-dashboard` | `steps` |
| F6 | Sensor Monitor | B | — | `sensors` | `sensors` |
| F7 | Goals | B | `goal` | `goals` | — |
| F8 | Offline Sync | B | `sync` | `sync`, `services/sync` | `sync` |
| F9 | Local notification + pin | B | — | `notifications` | `notification` |

## File nóng — ai được sửa

| File | Chủ | Quy tắc |
|---|---|---|
| `FitSenseMobile/package.json`, `android/build.gradle`, `android/app/build.gradle`, `FitSenseBackend/pom.xml` | cả hai | đã cài đủ ngày 1; thêm mới thì báo trước, một người sửa, merge ngay |
| `android/app/src/main/AndroidManifest.xml` | B | đã khai báo đủ quyền/service/receiver ngày 1 |
| `android/.../FitSensePackage.kt` | B | đăng ký đủ module ngày 1 |
| `android/.../database/*` (Room) | B | đủ 6 bảng; đổi cột thì tăng version + migration, báo A |
| `FitSenseBackend/.../db/migration/V1__init.sql` | chung | **không sửa**; thay đổi thì `V2__...` của chủ feature |
| `auth/SecurityConfig.java`, `auth/FirebaseFilter.java` | A (F1) | người khác cần đổi route công khai thì nhờ A |
| `src/app/navigation/*` | B | route khai báo sẵn; feature chỉ thay nội dung màn hình |
| `fitsense-documentation/openapi.yaml` | theo feature | mỗi người sửa endpoint của mình, commit riêng |
| `fitsense-documentation/native-interface.d.ts` | theo module | module của feature nào thì người đó sửa, báo người kia |
| `fitsense-documentation/OWNERSHIP.md` | cả hai | khi đổi hợp đồng dữ liệu |

## Hợp đồng dữ liệu giữa A và B

| Dữ liệu | Chủ sở hữu | Người dùng | Giao diện | Ở đâu |
|---|---|---|---|---|
| `todayActivity` (steps, distance, calories, activeMinutes) | B (F5) | A (Analytics), B (Goals) | Zustand `useTodayActivity` + bảng `local_activity` | `src/stores/useTodayActivity.ts`, `room-schema.md` |
| `local_exercise`, `local_gps_points` | A (F2) | B (Sync, Goals đếm số buổi tập) | Bảng Room + DAO, `NativeModules.LocalDbModule` | `fitsense-documentation/native-interface.d.ts`, `room-schema.md` |
| Profile (chiều cao, cân nặng) | A (F1) | B (tính stride, calories) | Hook `useProfile()` đọc Firestore | `src/features/profile` |
| Goals (mục tiêu) | B (F7) | A (Analytics: tỷ lệ hoàn thành) | `GET/POST/PUT/DELETE /api/goals` + `useGoals()` | `openapi.yaml` |
| `SyncHandler` | từng feature | B (`SyncManager`) | interface `SyncHandler` | `native-interface.d.ts`, `src/services/sync` |
| Token đăng nhập | A (F1) | mọi người | axios client đã gắn token | `src/services/api/client.ts` |
| Định dạng lỗi API | chung | mọi người | `ApiResponse` / `ApiError` | `openapi.yaml`, `src/services/api/errors.ts` |

## Chế độ xác thực của backend

| `fitsense.auth.mode` | Dùng khi | Yêu cầu |
|---|---|---|
| `firebase` | tích hợp thật, demo, Docker | `GOOGLE_APPLICATION_CREDENTIALS` hoặc `FIREBASE_SERVICE_ACCOUNT_JSON` |
| `dev` | chạy khung không cần Firebase | header `Authorization: Bearer <FITSENSE_DEV_TOKEN>` |

Mặc định backend chạy profile `dev` (nhóm `dev-auth`), token `dev-token`. Chạy Docker/production phải đặt
`FITSENSE_AUTH_MODE=firebase` và không kích hoạt profile `dev`.

## Nhánh

`main` (luôn chạy, bảo vệ, merge bằng PR) ← `dev` ← `feature/<tên-feature>`. Rebase lên `dev` mỗi sáng.
