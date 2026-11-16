# 08 — Mobile Codebase Guide (FitSenseMobile)

Tài liệu mô tả cấu trúc, cấu hình build và cách các phần của app React Native + native Android liên kết với nhau.

- **Phạm vi:** `FitSenseMobile/` (React Native TypeScript + Kotlin native module)
- **Nền tảng thật:** Android. iOS chỉ chạy mock native.
- **Hợp đồng native ↔ JS:** `FitSenseMobile/src/types/native-interface.d.ts`
- **Cập nhật lần cuối:** 2026-11-15

---

## 1. Kiến trúc tổng thể

```
┌──────────────────────────── JS / TypeScript ────────────────────────────┐
│ index.js → App.tsx → Providers → Navigation → Screens                   │
│                                   │                                     │
│        features/* (hook + API)    │    stores/* (Zustand)               │
│                 │                 │         │                           │
│        services/native ───────────┼─────────┘                           │
│        services/api ──────────────┼──► Backend REST (Spring/MySQL)      │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │ NativeModules / DeviceEventEmitter
                                    │ hợp đồng: src/types/native-interface.d.ts
┌───────────────────────────────────▼─────────────────────────────────────┐
│                         Android native (Kotlin)                         │
│ StepCounter · MotionSensor · Exercise · LocalDb(Room) · Notification ·  │
│ Sync · Foreground Service · WorkManager · BootReceiver                  │
└─────────────────────────────────────────────────────────────────────────┘
```

Nguyên tắc:

1. UI và state nằm ở JS/TS.
2. Phần cần quyền hệ thống, cảm biến, GPS, DB local nằm ở Kotlin.
3. Mọi trao đổi native ↔ JS đi qua `native-interface.d.ts`. Đổi tên method/event/payload phải sửa file này trước.

---

## 2. Bản đồ thư mục

### 2.1 Thư mục gốc `FitSenseMobile/`

| Đường dẫn | Vai trò |
|---|---|
| `index.js` | Entry point RN: `AppRegistry.registerComponent(appName, () => App)` |
| `App.tsx` | Bọc provider: SafeArea → Theme → React Query → Auth → Navigator |
| `app.json` | Tên app (`FitSenseMobile`), khớp `MainActivity.getMainComponentName()` |
| `src/` | Toàn bộ code TS/React Native |
| `android/` | Project Android native + Kotlin module |
| `ios/` | Project iOS mặc định của RN; native module chưa có nên dùng mock |
| `__tests__/` | Jest test cấp app (`App.test.tsx`) |
| `__mocks__/` | Mock Firebase Auth/Firestore và Google Sign-In cho Jest |
| `package.json` | Dependency + script `android`, `ios`, `start`, `test`, `lint` |
| `jest.config.js`, `babel.config.js`, `metro.config.js`, `tsconfig.json` | Cấu hình build/test |
| `.eslintrc.js`, `.prettierrc.js` | Lint/format |
| `Gemfile`, `.bundle/` | CocoaPods cho iOS |
| `node_modules/`, `.codegraph/` | Dependency / index code (không sửa) |

### 2.2 `src/` — từng folder

```
src/
├── app/            "vỏ" ứng dụng: navigation + provider
├── components/     UI dùng chung
├── features/       từng tính năng, mỗi folder tự chứa screen + hook + API + type
├── services/       lớp giao tiếp bên ngoài (native, HTTP, Firebase, sync)
├── stores/         state toàn cục Zustand
├── theme/          màu, spacing, typography
├── types/          hợp đồng native ↔ JS
└── utils/          hàm tiện ích thuần (ngày tháng)
```

#### `src/app/`

| File | Việc |
|---|---|
| `navigation/RootNavigator.tsx` | Chọn `AuthStack` hay `MainTabs` theo `useAuthStore.isAuthenticated`; hiện Loading khi `initializing`; màn `SensorMonitor` nằm ngoài tab |
| `navigation/AuthStack.tsx` | Login → Register → ResetPassword |
| `navigation/MainTabs.tsx` | 5 tab: Dashboard, Exercise, Analytics, Goals, Profile |
| `navigation/types.ts` | Param list của 3 navigator |
| `providers/AuthProvider.tsx` | Nghe `onAuthStateChanged` của Firebase, đẩy token/user vào Zustand, gọi `syncProfileToBackend` lần đầu |
| `providers/QueryProvider.tsx` | Cấu hình React Query (`retry: 1`, `staleTime: 30s`) |
| `providers/ThemeProvider.tsx` | Theo `useColorScheme()` để tạo theme sáng/tối |

#### `src/components/common/`

`Button`, `Card`, `Input`, `Loading`, `EmptyState`, `ErrorState`, `TabPlaceholderScreen` — UI thuần, không biết nghiệp vụ. `index.ts` re-export để import gọn.

#### `src/features/` — mỗi tính năng một "vertical slice"

| Folder | Nội dung | Ghi chú |
|---|---|---|
| `auth/` | `googleSignIn.ts`, 3 screen, `authErrors.ts` | Firebase Auth; lỗi Firebase map sang message tiếng Việt |
| `steps-dashboard/` | `useStepCounter.ts`, `dashboardMetrics.ts`, `DashboardScreen` | Nghe `STEP_UPDATE`, tính km/calo/phút/% mục tiêu |
| `sensors/` | `useMotionSensor.ts`, `SensorMonitorScreen` | Nghe `MOTION_SAMPLE` + `MOTION_LABEL_CHANGED`, giữ buffer 50 mẫu |
| `exercise/` | `exerciseNative.ts`, `exerciseApi.ts`, `useExerciseTracking.ts`, các screen/navigator | Phiên GPS: start/pause/resume/finish, lưu local, upload server, khôi phục phiên bị kill |
| `analytics/` | `useAnalytics.ts`, `analyticsApi.ts`, `screens/AnalyticsScreen.tsx` | Gọi API tuần/tháng; lỗi mạng thì tự tính offline từ Room |
| `goals/` | `useGoals.ts`, `goalsApi.ts`, `goalProgress.ts` | CRUD mục tiêu + tổng hợp buổi tập tuần từ `local_exercise` |
| `profile/` | `profileApi.ts`, `useProfile.ts`, `screens/ProfileScreen.tsx` | GET/PUT `/api/users/me` |
| `notifications/` | `index.ts` rỗng | Chỗ đặt UI F9; native đã có `Notification` |
| `sync/` | `index.ts` rỗng | Chỗ đặt UI F8; logic hàng đợi ở `services/sync` |

Lưu ý: một số screen có bản trùng ở gốc feature và trong `screens/`. Navigation đang dùng bản trong `screens/`; bản ở gốc là code cũ.

#### `src/services/`

| Folder/file | Việc |
|---|---|
| `native/index.ts` | Chọn native module thật trên Android, mock trên iOS/Jest; export `StepCounter`, `MotionSensor`, `Exercise`, `LocalDb`, `Notification`, `Sync`, `addNativeListener` |
| `native/mock.ts` | Cài đặt giả cùng shape, tự phát event để UI/test chạy được |
| `api/client.ts` | Axios instance; request interceptor gắn Bearer token Firebase; response interceptor chuẩn hoá lỗi |
| `api/config.ts` | `API_BASE_URL` (dev đang hard-code IP LAN `192.168.1.43:8080`) |
| `api/errors.ts`, `types.ts`, `health.ts` | Kiểu lỗi, envelope `{success,data,error}`, health check |
| `firebase/index.ts` | Khởi tạo/export Firebase |
| `sync/index.ts` | `SyncManager` giữ `SyncHandler` theo `entityType`, chuyển tiếp xuống native `Sync` |

#### `src/stores/` (Zustand)

- `useAuthStore` — token, user, `isAuthenticated`, `initializing`, signOut.
- `useTodayActivity` — đọc `LocalDb.getTodayActivity()` vào state cho Dashboard.
- `useSyncStatus` — pending/syncing/lastSync/lastError, feed bởi event `SYNC_STATUS`.

#### `src/theme/`, `src/utils/`, `src/types/`

- `theme/`: `colors`, `spacing`, `typography`, `createTheme(isDark)`.
- `utils/date.ts`: `todayIsoDate`, `deviceTimeZone` — dùng chung với mock.
- `types/native-interface.d.ts`: **hợp đồng duy nhất** giữa Kotlin và TS.

---

## 3. Android build config

Chỉ có **một Gradle module là `:app`**. `common`, `sensors`, `location`, `notification`, `database`, `steps`, `sync` là package Kotlin trong cùng module, không phải module Gradle riêng.

```
Tầng 1: Gradle          → android/build.gradle, settings.gradle, app/build.gradle
Tầng 2: AndroidManifest → quyền, service, receiver, Application/Activity
Tầng 3: Đăng ký module  → MainApplication → FitSensePackage → từng NativeModule
```

### 3.1 `android/settings.gradle`

```gradle
pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings") }
extensions.configure(com.facebook.react.ReactSettingsExtension) {
    ex -> ex.autolinkLibrariesFromCommand()
}
rootProject.name = 'FitSenseMobile'
include ':app'
includeBuild('../node_modules/@react-native/gradle-plugin')
```

- `autolinkLibrariesFromCommand()` tự sinh config cho thư viện RN trong `node_modules` (Firebase, Google Sign-In, screens, svg, maps…).
- Native module tự viết không autolink — phải đăng ký tay ở `FitSensePackage`.

### 3.2 `android/build.gradle` (root)

```gradle
buildscript {
    ext {
        buildToolsVersion = "37.0.0"
        minSdkVersion = 24
        compileSdkVersion = 37
        targetSdkVersion = 36
        ndkVersion = "27.1.12297006"
        kotlinVersion = "2.4.0"
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.0")
        classpath("com.google.devtools.ksp:...:2.3.13")
        classpath("com.google.gms:google-services:4.5.0")
    }
}
```

| Thành phần | Dùng để |
|---|---|
| `minSdk 24` | Android 7.0+ |
| `targetSdk 36` | Chính sách Android mới nhất |
| `kotlinVersion 2.4.0` | Compile toàn bộ `.kt`, gồm test |
| KSP plugin | Sinh code Room từ `@Entity/@Dao/@Database` |
| google-services | Đọc `google-services.json` cho Firebase |
| React Gradle Plugin | Bundle JS, codegen New Architecture |

### 3.3 `android/gradle.properties`

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=2048m
android.useAndroidX=true
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
newArchEnabled=true
hermesEnabled=true
edgeToEdgeEnabled=true
android.builtInKotlin=false
android.newDsl=false
```

- `newArchEnabled=true`: RN dùng New Architecture (Fabric/TurboModule). Module hiện tại vẫn là old-arch `ReactContextBaseJavaModule`, chạy qua lớp tương thích.
- `hermesEnabled=true`: dùng Hermes thay JSC.
- 4 kiến trúc CPU → APK debug nặng; giới hạn bằng `-PreactNativeArchitectures=x86_64` khi cần build nhanh.

### 3.4 `android/app/build.gradle`

Plugin:

```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"
apply plugin: "com.google.devtools.ksp"
apply plugin: 'com.google.gms.google-services'
```

Thiếu `ksp` → Room không sinh `FitSenseDatabase_Impl`, build fail.
Thiếu `google-services` → Firebase Auth/Google Sign-In không có config.

Android block:

```gradle
namespace "com.fitsensemobile"
applicationId "com.fitsensemobile"
minSdkVersion rootProject.ext.minSdkVersion
targetSdkVersion rootProject.ext.targetSdkVersion
manifestPlaceholders = [usesCleartextTraffic: "true"]   // debug
```

- Debug cho phép HTTP thường (gọi backend LAN); release đặt `"false"`.
- Release hiện ký bằng `debug.keystore` (chưa dùng cho production).

Dependency:

```gradle
implementation("com.facebook.react:react-android")

implementation("androidx.core:core-ktx:1.16.0")
implementation("androidx.room:room-runtime:2.7.2")
implementation("androidx.room:room-ktx:2.7.2")
ksp("androidx.room:room-compiler:2.7.2")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
implementation("androidx.work:work-runtime-ktx:2.10.0")

testImplementation("junit:junit:4.13.2")
```

| Dependency | Package dùng |
|---|---|
| `room-runtime`, `room-ktx`, `room-compiler` (KSP) | `database/` |
| `kotlinx-coroutines-android` | `steps/`, `database/`, mọi nơi dùng `suspend` |
| `work-runtime-ktx` | `steps/StepSnapshotWorker` |
| `junit` | `src/test/` |
| `react-android` | `common/`, tất cả module |

### 3.5 Luồng build APK

```
settings.gradle (include :app, autolink)
        ▼
root build.gradle (plugin + SDK version)
        ▼
app/build.gradle
   ├─ KSP đọc @Database/@Entity/@Dao → sinh Room implementation
   ├─ Kotlin compile toàn bộ src/main/java/com/fitsensemobile/**
   ├─ AAPT2 compile res/ + merge AndroidManifest.xml
   └─ React plugin bundle JS (release) / để Metro phục vụ (debug)
        ▼
app-debug.apk / app-release.apk
```

---

## 4. AndroidManifest

`android/app/src/main/AndroidManifest.xml`

### 4.1 Quyền

```xml
INTERNET, ACCESS_NETWORK_STATE
ACTIVITY_RECOGNITION                           → StepCounter
ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION   → Exercise
FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION → LocationForegroundService
POST_NOTIFICATIONS                             → NotificationModule (Android 13+)
RECEIVE_BOOT_COMPLETED                         → BootReceiver
```

Thiếu quyền ở đây thì runtime xin quyền luôn trả `DENIED`, dù code Kotlin đúng.

### 4.2 Component

```xml
android:name=".MainApplication"   → khởi tạo ReactHost + FitSensePackage
android:name=".MainActivity"      → Activity RN duy nhất, component "FitSenseMobile"
android:name=".location.LocationForegroundService"  (foregroundServiceType="location")
android:name=".notification.BootReceiver"           (BOOT_COMPLETED)
```

---

## 5. Đăng ký native module

### 5.1 `MainApplication.kt`

```kotlin
override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
        context = applicationContext,
        packageList = PackageList(this).packages.apply {
            add(FitSensePackage())
        },
    )
}
```

- `PackageList` = các package autolink từ node_modules.
- `add(FitSensePackage())` = package tự viết.

### 5.2 `FitSensePackage.kt` — bảng đăng ký trung tâm

```kotlin
override fun createNativeModules(reactContext: ReactApplicationContext) =
    listOf(
        StepCounterModule(reactContext),
        MotionSensorModule(reactContext),
        ExerciseModule(reactContext),
        LocalDbModule(reactContext),
        NotificationModule(reactContext),
        SyncModule(reactContext),
    )
```

| Tên JS (`NativeModules.X`) | Class Kotlin | Package | Trạng thái |
|---|---|---|---|
| `StepCounter` | `StepCounterModule` | `steps` | Thật |
| `MotionSensor` | `MotionSensorModule` | `sensors` | Thật |
| `Exercise` | `ExerciseModule` | `location` | Stub |
| `LocalDb` | `LocalDbModule` | `database` | Thật |
| `Notification` | `NotificationModule` | `notification` | Một phần |
| `Sync` | `SyncModule` | `sync` | Stub |

Tên này do `override fun getName(): String` trong từng class quyết định, không phải tên class.

### 5.3 `ExercisePackage.kt` — có nhưng chưa dùng

```kotlin
class ExercisePackage : ReactPackage {
    override fun createNativeModules(...) = listOf(ExerciseModule(reactContext))
}
```

`MainApplication` chỉ add `FitSensePackage` (đã chứa `ExerciseModule`), nên `ExercisePackage` hiện vô tác dụng.

### 5.4 Cầu nối JS — `src/services/native/index.ts`

```ts
const useMock = Platform.OS !== 'android';

export const LocalDb = useMock
  ? mockNative.LocalDb
  : pick('LocalDb', pick('LocalDbModule', mockNative.LocalDb));
```

- Android → module thật.
- iOS/Jest → mock để UI không crash.
- Có fallback `'LocalDbModule'` phòng tên cũ.
- **Cảnh báo:** quên đăng ký module thì `pick` trả mock, app vẫn chạy nhưng dữ liệu là giả.

---

## 6. `database/` — LocalDb và Room

### 6.1 Cấu trúc package

```
database/
├── FitSenseDatabase.kt        @Database, singleton
├── LocalDbModule.kt           cầu JS → Room
├── entity/                    6 bảng
│   ├── LocalActivityEntity.kt
│   ├── LocalExerciseEntity.kt
│   ├── LocalGpsPointEntity.kt
│   ├── StepSnapshotEntity.kt
│   ├── SyncQueueEntity.kt
│   └── SensorSampleEntity.kt
└── dao/
    ├── LocalActivityDao.kt
    ├── LocalExerciseDao.kt
    ├── LocalGpsPointDao.kt
    ├── StepSnapshotDao.kt
    ├── SyncQueueDao.kt
    └── SensorSampleDao.kt
```

### 6.2 `FitSenseDatabase.kt` — config gốc

```kotlin
@Database(
    entities = [
        LocalActivityEntity::class,
        LocalExerciseEntity::class,
        LocalGpsPointEntity::class,
        SyncQueueEntity::class,
        StepSnapshotEntity::class,
        SensorSampleEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class FitSenseDatabase : RoomDatabase() {
    abstract fun localActivityDao(): LocalActivityDao
    ...
    companion object {
        private const val DB_NAME = "fitsense.db"
        @Volatile private var instance: FitSenseDatabase? = null

        fun getInstance(context: Context) = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                FitSenseDatabase::class.java,
                DB_NAME,
            ).build().also { instance = it }
        }
    }
}
```

| Cấu hình | Ý nghĩa | Khi sửa |
|---|---|---|
| `entities = [...]` | Danh sách bảng Room biết | Thêm entity mới phải thêm vào đây |
| `version = 1` | Schema version | Đổi cột/bảng → tăng version + migration |
| `exportSchema = false` | Không xuất JSON schema | Nên bật `true` + `room.schemaLocation` nếu làm migration nghiêm túc |
| `DB_NAME = "fitsense.db"` | File SQLite trong `/data/data/com.fitsensemobile/databases/` | Đổi tên = mất dữ liệu cũ |
| singleton `@Volatile + synchronized` | Chỉ 1 instance | Giữ nguyên pattern |
| không có `fallbackToDestructiveMigration()` | Tăng version mà thiếu migration → crash runtime | Phải viết `Migration(1,2)` |

### 6.3 Schema 6 bảng

#### `local_activity` — tổng hoạt động theo ngày

```kotlin
@Entity(tableName = "local_activity")
data class LocalActivityEntity(
    @PrimaryKey @ColumnInfo(name = "activity_date") val activityDate: String,
    val timezoneId: String,
    val steps: Int,
    val distanceM: Double,
    val calories: Double,
    val activeMinutes: Int,
    val updatedAt: Long,
    val syncState: String,
)
```

PK là ngày `yyyy-MM-dd` → một dòng/ngày. Nguồn của `useTodayActivity` và đồng bộ `DAILY_ACTIVITY`.

#### `step_snapshots` — trạng thái counter theo ngày

```kotlin
@PrimaryKey val date: String
val timezoneId: String
val baselineCounter: Long
val lastCounter: Long
val steps: Int
val bootCount: Int
val updatedAt: Long
```

"Bộ nhớ" của `StepBaselineCalculator`; chống mất bước khi app bị kill/reboot.

#### `local_exercise` — buổi tập

PK `id` (UUID), `type`, `status`, `started_at`, `ended_at?`, `paused_total_ms`, `distance_m`, `duration_seconds`, `calories`, `avg_pace_sec_per_km?`, `point_count`, `updated_at`, `sync_state`.

#### `local_gps_points` — điểm GPS

```kotlin
ForeignKey(
    entity = LocalExerciseEntity::class,
    parentColumns = ["id"],
    childColumns = ["session_id"],
    onDelete = ForeignKey.CASCADE,
)
indices = [Index(value = ["session_id", "seq"], unique = true)]
```

- Xoá buổi tập → xoá toàn bộ điểm.
- Không thể có 2 điểm cùng `seq` trong một session.

#### `sync_queue` — hàng đợi đồng bộ

```kotlin
indices = [Index(value = ["entity_type", "client_id"], unique = true)]
```

Các cột: `entity_type`, `client_id`, `operation`, `payload` (JSON string), `state`, `attempts`, `next_attempt_at`, `last_error`, `created_at`, `updated_at`.

Unique đôi `(entity_type, client_id)` đảm bảo một bản ghi không bị enqueue 2 lần.

#### `sensor_samples` — mẫu cảm biến thô

`type`, `x`, `y`, `z`, `magnitude`, `label`, `recorded_at` (có index để query theo thời gian).

### 6.4 DAO

| DAO | Method chính |
|---|---|
| `LocalActivityDao` | `getByDate`, `upsert`, `getRange` |
| `StepSnapshotDao` | `getByDate`, `getLatest`, `getRange`, `upsert`, `upsertAll` |
| `LocalExerciseDao` | `insert(REPLACE)`, `getById`, `getPage`, `countBetween` |
| `LocalGpsPointDao` | `insertAll(REPLACE)`, `getBySession` |
| `SyncQueueDao` | `enqueue(IGNORE)`, `getPending`, `countPending`, `updateState` |
| `SensorSampleDao` | `insert`, `getRange` |

Tất cả là `suspend` → phải gọi trong coroutine hoặc `runBlocking`, không gọi trên main thread.

### 6.5 `LocalDbModule.kt` — cầu JS ↔ Room

```kotlin
class LocalDbModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    private val db by lazy { FitSenseDatabase.getInstance(context) }
    private val executor = Executors.newSingleThreadExecutor()

    override fun getName(): String = "LocalDb"
```

| Thành phần | Tác dụng |
|---|---|
| `getName() = "LocalDb"` | Tên `NativeModules.LocalDb` bên JS |
| `db by lazy` | Chỉ mở DB khi method đầu tiên được gọi |
| `Executors.newSingleThreadExecutor()` | Truy vấn chạy tuần tự ngoài main thread |
| `runBlocking { ... }` | Cầu nối API `suspend` của Room sang callback `Promise` |
| `runCatching {}` | Bắt exception → `promise.reject("DATABASE_ERROR", ...)` |
| `@ReactMethod` | Đánh dấu method được JS gọi |

4 method được expose:

```kotlin
getTodayActivity(promise)
upsertTodayActivity(row, promise)
getLocalExercises(limit, offset, promise)
getLocalExercisePoints(sessionId, promise)
```

Chuyển đổi dữ liệu:

```kotlin
// JS number luôn là Double → phải ép kiểu
private fun ReadableMap.getIntOrZero(key: String) =
    if (hasKey(key) && !isNull(key)) getDouble(key).toInt() else 0

// Kotlin Long → JS number
putDouble("startedAtMs", startedAt.toDouble())
```

Module **không** expose `step_snapshots`, `sync_queue`, `sensor_samples`. Các bảng này chỉ dùng nội bộ bởi `StepStore` / `SyncModule` / sensor.

### 6.6 Chuỗi gọi LocalDb

```
Component (useTodayActivity / useGoals / useAnalytics)
        ▼
LocalDb.getTodayActivity()          ← src/services/native/index.ts
        ▼
NativeModules.LocalDb
        ▼
LocalDbModule.getTodayActivity(promise)
        ▼ executor + runBlocking
LocalActivityDao.getByDate(today)
        ▼
Room (fitsense.db)
        ▼
WritableMap → Promise.resolve → JS
```

### 6.7 Quy trình thêm bảng/cột

1. Tạo/sửa `entity/XEntity.kt` (`@Entity`, cột snake_case).
2. Tạo/sửa `dao/XDao.kt` (`@Dao`, method `suspend`).
3. Thêm `XEntity::class` vào `@Database(entities = [...])` và thêm `abstract fun xDao()`.
4. Tăng `version` và viết `Migration` nếu đã có dữ liệu người dùng.
5. Build lại để KSP sinh code: `.\gradlew.bat :app:assembleDebug`.
6. Nếu JS cần dùng: thêm `@ReactMethod` trong `LocalDbModule` + khai báo trong `src/types/native-interface.d.ts`.

---

## 7. Các package native còn lại

### 7.1 `com/fitsensemobile/common/` — hạ tầng dùng chung

| File | Config/hằng số |
|---|---|
| `TimeUtils.kt` | Format ngày `yyyy-MM-dd`, timezone mặc định thiết bị, epoch ms |
| `PermissionHelper.kt` | Check `checkSelfPermission`, map sang `GRANTED/DENIED` |
| `EventEmitterHelper.kt` | Chỉ emit khi `hasActiveReactInstance()`; dùng `RCTDeviceEventEmitter` |

Không có state, không cần khởi tạo; các package khác import trực tiếp.

### 7.2 `com/fitsensemobile/sensors/`

Cấu hình tập trung ở `SensorConfig.kt`:

```kotlin
const val WINDOW_MS = 2_000L
const val MIN_SAMPLES = 10
const val EVAL_STEP_MS = 500L
const val STABLE_WINDOWS = 3
const val STILL_MAX_STD = 0.35
const val WALKING_MAX_STD = 2.2
const val RUNNING_MIN_STD = 2.6
const val RUNNING_FULL_STD = 5.0
const val EMIT_INTERVAL_MIN_MS = 50L
const val EMIT_INTERVAL_DEFAULT_MS = 100L
```

Đây là nơi duy nhất nên chỉnh ngưỡng phân loại. `MotionSensorModule` đọc các hằng này trong constructor của `MovementClassifier` và trong `setEmitInterval` (kẹp tối thiểu 50 ms = 20 Hz).

Cấu hình runtime khác:

- `SensorManager.SENSOR_DELAY_UI` cho accelerometer/gyroscope.
- Tự `unregister` ở `onHostPause`, đăng ký lại ở `onHostResume`.
- `getSnapshot()` trả label/confidence/lastSample hiện tại.

### 7.3 `com/fitsensemobile/location/`

| File | Config |
|---|---|
| `ExerciseModule.kt` | Chỉ giữ session trong RAM; `getName() = "Exercise"`; type mặc định `RUNNING` |
| `LocationForegroundService.kt` | `START_STICKY`, chưa có logic GPS |
| `ExerciseLocalDbHelper.kt` | SQLite riêng `fitsense_exercise.db`, version 1 — không nằm trong Room |
| `ExercisePackage.kt` | Không được add vào `MainApplication` |

Manifest đã khai báo service với `foregroundServiceType="location"` và quyền location, nhưng module chưa dùng DB helper, chưa start service, chưa ghi GPS.

### 7.4 `com/fitsensemobile/notification/`

```kotlin
CHANNEL_DEFAULT  = "fitsense_default"
CHANNEL_ACTIVITY = "fitsense_activity"
CHANNEL_GOAL     = "fitsense_goal"
```

- Channel tạo trong `init` và `ensureReady()` (idempotent).
- Android < 13 luôn coi như có quyền; Android 13+ check `POST_NOTIFICATIONS`.
- `show()` dùng `NotificationCompat` + `android.R.drawable.ic_dialog_info`.
- `scheduleDailyReminders()` / `cancelDailyReminders()` chưa nối WorkManager.
- `BootReceiver` được manifest kích hoạt khi `BOOT_COMPLETED`, gọi `StepSnapshotWorker.enqueueNow/enqueuePeriodic`.

### 7.5 `com/fitsensemobile/steps/`

| Vị trí | Hằng số | Ý nghĩa |
|---|---|---|
| `StepCounterModule` | `PERMISSION = ACTIVITY_RECOGNITION` | Quyền bắt buộc từ Android 10 |
| | `REQUEST_CODE = 5105` | Mã request quyền |
| | `KEY_ASKED` | Cờ trong `SharedPreferences("fitsense_step_counter")` để phân biệt DENIED vs PERMANENTLY_DENIED |
| | `PERSIST_INTERVAL_MS = 5_000L` | Ghi snapshot mỗi 5 giây |
| | `SensorManager.SENSOR_DELAY_UI` | Tần số đọc counter |
| `StepSnapshotWorker` | `15 phút` | Chu kỳ chốt dữ liệu |
| `StepCounterReader` | `timeoutMs = 5_000` | Chờ sensor trả giá trị một lần |
| `StepMetrics` | `170 cm`, `70 kg`, stride `0.00415`, calo `0.5` | Công thức mặc định khi chưa có profile |
| `StepBaselineCalculator` | `Int.MAX_VALUE` | Kẹp số bước |

Worker được đăng ký 2 nơi:

- `StepCounterModule.start()` → `enqueuePeriodic`
- `BootReceiver` → `enqueueNow` + `enqueuePeriodic`

Cả hai dùng `ExistingPeriodicWorkPolicy.KEEP` / `ExistingWorkPolicy.REPLACE` để không tạo worker trùng.

### 7.6 `com/fitsensemobile/sync/`

| File | Config |
|---|---|
| `SyncModule.kt` | `getName() = "Sync"`, mọi method trả rỗng/0 — stub |
| `SyncHandler.kt` | Interface `entityType` + `collectPending(limit)` |
| Bảng `sync_queue` | Đã có schema đầy đủ (state, attempts, next_attempt_at, last_error) |

JS `SyncManager` đã có lớp trung gian, nhưng chưa có handler nào được đăng ký và `SyncModule` chưa đọc/ghi bảng.

---

## 8. Luồng hoạt động end-to-end

### 8.1 Khởi động app

```
index.js
  └─ App.tsx
       ├─ SafeAreaProvider
       ├─ ThemeProvider        (useColorScheme → createTheme)
       ├─ QueryProvider        (React Query client)
       ├─ AuthProvider         (Firebase onAuthStateChanged)
       └─ RootNavigator
            ├─ initializing → Loading
            ├─ chưa login  → AuthStack (Login/Register/Reset)
            └─ đã login    → MainTabs (5 tab)
```

### 8.2 Đăng nhập

`LoginScreen` → `signInWithGoogle` / Firebase email → `AuthProvider` nhận user → `useAuthStore.setSession(token, user)` → `RootNavigator` chuyển sang `MainTabs`.

Mọi request sau đó đi qua `apiClient`, interceptor tự lấy `getIdToken()` mới nhất gắn `Authorization: Bearer ...`.

### 8.3 Đếm bước chân

```
TYPE_STEP_COUNTER
   ▼
StepCounterModule.onSensorChanged
   ├─ compute(counter) ──► StepBaselineCalculator.compute()
   │        (cache snapshot trong RAM, mutex chống race)
   ├─ mỗi 5s: StepStore.persistState()  ──► Room step_snapshots
   └─ emit STEP_UPDATE
              ▼
useStepCounter (addNativeListener)
              ▼
DashboardScreen ── dashboardMetrics() ──► km / kcal / phút / % mục tiêu
```

- `StepSnapshotWorker` chạy mỗi 15 phút và `BootReceiver` chạy sau reboot để chốt số bước khi app bị kill.
- `StepStore.persist()` ghi thêm `local_activity` (steps/distance/calories/activeMinutes, `syncState = PENDING`), là nguồn cho `useTodayActivity`, Goals và Analytics offline.

### 8.4 Phát hiện chuyển động

```
Accelerometer (+ Gyroscope)
   ▼
MotionSensorModule (throttle ~10 Hz, tự dừng khi app background)
   ├─ emit MOTION_SAMPLE ──────► useMotionSensor giữ 50 mẫu → chart
   └─ MovementClassifier
          └─ emit MOTION_LABEL_CHANGED ─► label + confidence trên UI
```

### 8.5 Bài tập GPS

```
ExerciseTrackingScreen
   └─ useExerciseTracking
        ├─ exerciseNative.requestLocationPermission()
        ├─ exerciseNative.start/pause/resume/finish ─► NativeModules.Exercise
        ├─ nghe EXERCISE_STATE (POINT_RECORDED, STARTED, ...)
        ├─ finish() → exerciseApi.createExercise() (chia batch GPS 500 điểm)
        └─ lỗi mạng → giữ local PENDING, upload lại sau
```

Phần native của luồng này hiện mới là stub (xem mục 10).

### 8.6 Goals / Analytics / Profile

- **Goals:** đọc `LocalDb.getLocalExercises()` (Room) để tính tuần này, CRUD mục tiêu qua `goalsApi` → backend.
- **Analytics:** `analyticsApi.getWeekly/getMonthly`; nếu request lỗi → tự dựng số liệu offline từ `exerciseNative.getLocalExercises` + `LocalDb.getTodayActivity`.
- **Profile:** `profileApi.getMyProfile/updateMyProfile` → `/api/users/me`; `AuthProvider` gọi một lần sau login để backend tạo row MySQL.

### 8.7 Sync (F8)

`services/sync/SyncManager` giữ các `SyncHandler` (collectPending/onResult) → gọi xuống `NativeModules.Sync` → về lý thuyết dùng bảng `sync_queue` và backend. Hiện `SyncModule` trả 0/null nên đây là khung chờ implement.

---

## 9. Unit test

### 9.1 Vị trí và vai trò

```
android/app/src/test/java/com/fitsensemobile/
├── steps/StepBaselineCalculatorTest.kt     (JUnit4, 8 test)
└── sensors/MovementClassifierTest.kt       (JUnit4, 7 test)
```

Đây là unit test JVM, không cần thiết bị/emulator. Chúng test hai class thuần Kotlin đã tách khỏi Android:

- `steps/StepBaselineCalculator.kt`
- `sensors/MovementClassifier.kt`

### 9.2 `StepBaselineCalculatorTest.kt`

Helper `state(...)` tạo snapshot lần đọc trước (ngày 12/11, baseline 1000, lastCounter 1500, steps 500, bootCount 7). Helper `input(...)` tạo dữ liệu lần đọc hiện tại (counter 1600, cùng ngày, cùng bootCount).

| Test | Hành vi được khoá |
|---|---|
| `first reading starts baseline at current counter` | Lần đọc đầu: baseline = counter, steps = 0 |
| `counter growth adds to today steps` | 1500 → 1750: cộng 250, steps = 750 |
| `unchanged counter keeps steps` | Counter không đổi: steps giữ nguyên |
| `reboot keeps steps and moves baseline to new counter` | `bootCount` đổi: không mất steps, dời baseline |
| `counter reset mid day keeps steps and moves baseline` | Counter tụt: xử lý như reset |
| `date rollover closes previous day and resets today` | Sang ngày: chốt ngày cũ, hôm nay bắt đầu từ 0 |
| `skipped days are closed without duplicating steps` | Ngày bỏ lỡ ghi 0 bước, không nhân đôi |
| `clock moving backwards keeps previous snapshot` | Đồng hồ lùi: trả nguyên snapshot cũ |

Chưa phủ: kẹp `Int.MAX_VALUE`, đổi bootCount cùng lúc sang ngày mới, `addDay()` qua tháng/năm, timezone đổi, ngày sai format.

### 9.3 `MovementClassifierTest.kt`

Helper `feed()` sinh tín hiệu sin quanh 9.81 m/s², mỗi mẫu cách 100 ms:

```kotlin
magnitude = 9.81 + amplitude * sin(2 * PI * i / 10.0)
```

Với sóng sin, `std ≈ amplitude / √2`:

| amplitude | std ≈ | Nhãn |
|---|---|---|
| 0.0 | 0.00 | STILL (< 0.35) |
| 1.0 | 0.71 | WALKING (0.35 – 2.2) |
| 3.3 | 2.33 | vùng hysteresis (2.2 – 2.6) |
| 4.0 | 2.83 | RUNNING (≥ 2.6) |

| Test | Hành vi |
|---|---|
| `not enough samples stays unknown` | < 10 mẫu → UNKNOWN, confidence 0 |
| `steady samples classify still` | amplitude 0 → STILL, confidence > 0.9 |
| `moderate oscillation classifies walking` | amplitude 1.0 → WALKING |
| `strong oscillation classifies running` | amplitude 4.0 → RUNNING |
| `short burst does not flip the label` | 1.2 giây chạy chưa đủ 3 cửa sổ → giữ STILL |
| `hysteresis gap keeps the previous label` | std 2.33 → giữ RUNNING |
| `reset clears window and label` | reset → UNKNOWN, confidence 0 |

Chưa phủ: gyroscope, throttle emit, lifecycle background/foreground, giá trị đúng bằng biên, nhiễu ngẫu nhiên.

### 9.4 Cách chạy

```powershell
cd D:\FitSense\FitSenseMobile\android
.\gradlew.bat :app:testDebugUnitTest
```

Chạy riêng một class:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.fitsensemobile.steps.StepBaselineCalculatorTest"
.\gradlew.bat :app:testDebugUnitTest --tests "com.fitsensemobile.sensors.MovementClassifierTest"
```

Báo cáo HTML: `android/app/build/reports/tests/testDebugUnitTest/index.html`

---

## 10. Bảng tra nhanh: đổi gì sửa ở đâu

| Nhu cầu | File |
|---|---|
| Đổi version SDK/Kotlin | `android/build.gradle` |
| Thêm thư viện native | `android/app/build.gradle` → `dependencies` |
| Thêm quyền | `AndroidManifest.xml` |
| Đổi tên/file DB Room | `database/FitSenseDatabase.kt` |
| Thêm bảng/cột | `database/entity`, `dao`, `FitSenseDatabase`, tăng `version` |
| Expose dữ liệu DB cho JS | `database/LocalDbModule.kt` + `src/types/native-interface.d.ts` |
| Đổi ngưỡng STILL/WALKING/RUNNING | `sensors/SensorConfig.kt` |
| Đổi tần số emit sensor | `SensorConfig.EMIT_INTERVAL_DEFAULT_MS` + `useMotionSensor` |
| Đổi chu kỳ lưu bước | `StepCounterModule.PERSIST_INTERVAL_MS`, `StepSnapshotWorker` (15 phút) |
| Đổi công thức km/calo | `steps/StepMetrics.kt` và `src/features/steps-dashboard/dashboardMetrics.ts` (phải khớp nhau) |
| Đổi channel notification | `notification/NotificationModule.kt` |
| Đổi API backend | `src/services/api/config.ts` |
| Đăng ký module mới | `FitSensePackage.kt` + `MainApplication.kt` (nếu package mới) |
| Đổi tên module JS | `override fun getName()` + `native-interface.d.ts` + `services/native/index.ts` |

---

## 11. Checklist thêm một native module mới

Ví dụ thêm `Bluetooth`:

```
1. android/app/build.gradle        → thêm dependency nếu cần
2. AndroidManifest.xml             → thêm permission/service nếu cần
3. com/fitsensemobile/bluetooth/BluetoothModule.kt
       - ReactContextBaseJavaModule
       - override getName() = "Bluetooth"
       - @ReactMethod ...
4. FitSensePackage.kt              → thêm BluetoothModule(reactContext) vào list
5. src/types/native-interface.d.ts → thêm interface + vào FitSenseNative
6. src/services/native/mock.ts     → implement mock cùng shape
7. src/services/native/index.ts    → export Bluetooth = pick('Bluetooth', mock)
8. Viết hook trong src/features/<feature>/useBluetooth.ts
9. Build: .\gradlew.bat :app:assembleDebug
```

Nếu tách package riêng như `ExercisePackage`, phải `add(...)` trong `MainApplication`, nếu không sẽ không tồn tại runtime.

---

## 12. Vấn đề cấu hình hiện tại

| Vấn đề | Hệ quả |
|---|---|
| `ExercisePackage` không được add | File thừa, dễ gây nhầm |
| `ExerciseModule` thiếu `getLocalExercises`, `getPendingSyncExercises`, `markSessionSynced` | `exerciseNative.ts` gọi sẽ lỗi runtime |
| `ExerciseLocalDbHelper` tách khỏi Room | Hai nguồn dữ liệu, không join được với `local_exercise` |
| `exportSchema = false`, chưa có migration | Đổi schema dễ crash người dùng cũ |
| `LocalDb` fallback im lặng sang mock | Quên đăng ký module sẽ không báo lỗi |
| `usesCleartextTraffic=true` ở debug | Chỉ dùng nội bộ, không release |
| Release ký `debug.keystore` | Không thể phát hành thật |
| `API_BASE_URL` hard-code IP LAN | Đổi mạng là phải sửa code |
| `SyncModule`, nhắc nhở notification còn stub | Chưa có đồng bộ/nhắc nhở thật |
| iOS dùng mock native | Không kiểm chứng được hành vi native trên iOS |

---

## 13. Lệnh thường dùng

```powershell
# Cài dependency
cd D:\FitSense\FitSenseMobile
npm install

# Chạy Metro
npm start

# Build & cài Android
npm run android

# Unit test JS
npm test

# Unit test Kotlin
cd android
.\gradlew.bat :app:testDebugUnitTest

# Chỉ build APK
.\gradlew.bat :app:assembleDebug
```
