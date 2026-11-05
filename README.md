# FitSense

Theo dõi sức khỏe: bước chân, cảm biến chuyển động, bài tập GPS, mục tiêu, thống kê, đồng bộ offline.

## Cấu trúc

```
FitSense/
├── FitSenseMobile/          React Native 0.87 (TypeScript) + native Kotlin Android
├── FitSenseBackend/         Spring Boot 4.1.2 (Java 21) + MySQL 8.4 + Flyway
├── fitsense-documentation/  4 giao ước + tài liệu ngày 1 và theo feature
│   ├── openapi.yaml
│   ├── native-interface.d.ts
│   ├── room-schema.md
│   └── OWNERSHIP.md
├── docker-compose.yml       MySQL + backend (namespace MySQL riêng)
├── .env.example             biến môi trường mẫu
├── BUGS.md                  danh sách lỗi
└── README.md
```

## Phiên bản công cụ

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| JDK | 21 | Spring Boot 4 yêu cầu tối thiểu 17; build với JDK ≥ 21 |
| Node | ≥ 22.11 (LTS) | |
| React Native | 0.87.0 | new architecture, Hermes |
| Kotlin / KSP | 2.2.0 / 2.2.0-2.0.2 | Room compiler qua KSP |
| Android | compileSdk 37, targetSdk 36, minSdk 24 | AGP theo RN template |
| MySQL | 8.4 | container, port host `3307` |
| Package Android | `com.fitsensemobile`, applicationId `com.fitsensemobile` | |

## Backend

```
cp .env.example .env          # lần đầu
docker compose up -d mysql
cd FitSenseBackend
./mvnw spring-boot:run        # profile dev, token giả "dev-token", không cần Firebase
```

Kiểm tra:

| Lệnh | Kỳ vọng |
|---|---|
| `curl http://localhost:8080/api/health` | `200`, `{"success":true,...,"authMode":"dev"}` |
| `curl -H "Authorization: Bearer dev-token" http://localhost:8080/api/ping-auth` | `200` |
| `curl http://localhost:8080/api/ping-auth` | `401`, `error.code = UNAUTHORIZED` |
| `http://localhost:8080/swagger-ui.html` | Swagger UI |
| `curl -H "Authorization: Bearer dev-token" http://localhost:8080/api/goals` | `501`, `error.code = NOT_IMPLEMENTED` |

Chạy cả backend trong Docker: `docker compose --profile full up --build` (cần `GOOGLE_APPLICATION_CREDENTIALS`
hoặc chuyển `FITSENSE_AUTH_MODE=dev` trong `.env` cho môi trường thử nội bộ).

Test: `cd FitSenseBackend && ./mvnw test` (H2, không cần MySQL).

Firebase thật: đặt `FITSENSE_AUTH_MODE=firebase` và trỏ `GOOGLE_APPLICATION_CREDENTIALS` tới service account
JSON (không commit) hoặc `FIREBASE_SERVICE_ACCOUNT_JSON`. Chi tiết ở `fitsense-documentation/OWNERSHIP.md`.

## Mobile

```
cd FitSenseMobile
npm install
adb reverse tcp:8080 tcp:8080
npm run android
```

`google-services.json` đặt tại `FitSenseMobile/android/app/` (git-ignored). Google Maps key: đặt
`GOOGLE_MAPS_API_KEY=...` trong `~/.gradle/gradle.properties`. Xem `FitSenseMobile/README.md`.

## Quy ước làm việc

- Nhánh: `main` (luôn chạy, merge bằng PR) ← `dev` ← `feature/<tên-feature>`; rebase lên `dev` mỗi sáng.
- Chỉ sửa trong thư mục feature của mình; cần sửa file nóng thì báo người kia trước.
- Đổi giao ước (API, native interface, schema, dữ liệu chia sẻ) thì sửa trong `fitsense-documentation/` và báo người kia.
- Không commit: `.env`, `google-services.json`, service account JSON, keystore. `.gitignore` gốc đã chặn.
