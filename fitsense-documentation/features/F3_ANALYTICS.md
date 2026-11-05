# F3 — ANALYTICS

**Owner:** Member A  
**Scope:** Weekly/monthly activity analytics, goal completion statistics, and charts.

## Implementation tasks from the project roadmap

The tasks below are extracted from the day-by-day plan. Keep the original sequence and completion conditions.

### #### Ngày 9

**A: [F2] Sync handler cho Exercise + [F3] Analytics bắt đầu**
- [ ] `ExerciseSyncHandler` (Kotlin) + `ExerciseSyncProcessor` (Spring): lô GPS (~500 điểm, có số thứ tự lô), upsert theo UUID, trong transaction.
- [ ] Lịch sử bài tập đọc từ Room khi offline.
- [ ] Backend Analytics: `GET /api/analytics/weekly` (tổng bước, trung bình ngày, tổng quãng đường chạy, tổng thời gian, số buổi, ngày hoạt động nhiều nhất, so tuần trước).
- [ ] Script seed dữ liệu mẫu cho test.

### #### Ngày 10

**A: [F3] Analytics (full-stack)**
- [ ] `GET /api/analytics/monthly`, tỷ lệ hoàn thành goal (đọc goals của B qua Admin SDK).
- [ ] Màn Analytics: bộ lọc ngày/tuần/tháng, biểu đồ steps, distance, calories, duration (gifted-charts), thẻ so sánh tuần, thống kê goal.
- [ ] Đọc dữ liệu từ Room khi offline.

## Definition of done

- Complete the feature's listed tasks and acceptance conditions.
- Add relevant tests.
- Test on a physical Android device where the feature uses native functionality.
- Update the shared API/native/database contract before changing an interface used by the other member.
- Merge the feature branch into `dev` and request review.
