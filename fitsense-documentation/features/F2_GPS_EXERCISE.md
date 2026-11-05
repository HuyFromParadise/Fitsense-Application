# F2 — GPS EXERCISE

**Owner:** Member A  
**Scope:** Foreground GPS tracking, exercise lifecycle, route persistence, history, and exercise sync.

## Implementation tasks from the project roadmap

The tasks below are extracted from the day-by-day plan. Keep the original sequence and completion conditions.

### #### Ngày 5

**A: [F2] GPS Exercise (phần 1: native)**
- [ ] Quyền location (foreground; background chỉ khi thật cần, có giải thích).
- [ ] `LocationForegroundService` (Fused Location, kênh notification riêng, `foregroundServiceType="location"`), ghi điểm vào `local_gps_points` bằng Kotlin.
- [ ] `ExerciseModule`: `start(type)`, `pause()`, `resume()`, `finish()`, `getActiveSession()`.
- [ ] Test thực địa: khóa màn hình, đi vài trăm mét.

### #### Ngày 6

**A: [F2] GPS Exercise (phần 2: backend + tracking UI)**
- [ ] Backend: `POST/GET/PUT /api/exercises`, `GET /api/exercises/{id}`, lưu session + gps_points + metrics trong **một transaction**, unique theo UUID (trùng thì trả bản đã có), validate lat/lng/timestamp, batch insert, phân trang.
- [ ] Mobile: màn tracking (chọn loại, Start/Pause/Resume/Finish, timer, live map, distance, pace, speed).
- [ ] Lọc điểm GPS xấu, Haversine, calories theo MET.

### #### Ngày 7: Tích hợp và buffer (nhẹ hơn)

**A: [F2]**
- [ ] Pause/resume đúng (không tính khoảng tạm dừng).
- [ ] Màn Exercise History (phân trang) và Exercise Detail (polyline route).
- [ ] Swagger: rà mô tả, ví dụ, mã lỗi cho feature của A.

### #### Ngày 8

**A: [F2] GPS Exercise (edge case)**
- [ ] Quyền bị từ chối (hướng dẫn mở Settings), GPS tắt, mất tín hiệu (đánh dấu đoạn thiếu), chuyển app, tắt màn hình.
- [ ] **App bị kill:** mở lại đọc `getActiveSession()` từ Room, hỏi tiếp tục hay kết thúc.
- [ ] Hộp thoại xác nhận Finish (giữ nút 2 giây), màn tóm tắt sau buổi tập.
- [ ] Đi thử ngoài đường với màn hình khóa ít nhất 15 phút.

### #### Ngày 9

**A: [F2] Sync handler cho Exercise + [F3] Analytics bắt đầu**
- [ ] `ExerciseSyncHandler` (Kotlin) + `ExerciseSyncProcessor` (Spring): lô GPS (~500 điểm, có số thứ tự lô), upsert theo UUID, trong transaction.
- [ ] Lịch sử bài tập đọc từ Room khi offline.
- [ ] Backend Analytics: `GET /api/analytics/weekly` (tổng bước, trung bình ngày, tổng quãng đường chạy, tổng thời gian, số buổi, ngày hoạt động nhiều nhất, so tuần trước).
- [ ] Script seed dữ liệu mẫu cho test.
## Cross-feature interfaces

- Member B's SyncManager consumes the exercise sync handler written by Member A.
- Goals may count completed sessions using `local_exercise`.
- Exercise data is stored locally in `local_exercise` and `local_gps_points`.


## Definition of done

- Complete the feature's listed tasks and acceptance conditions.
- Add relevant tests.
- Test on a physical Android device where the feature uses native functionality.
- Update the shared API/native/database contract before changing an interface used by the other member.
- Merge the feature branch into `dev` and request review.
