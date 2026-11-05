# F7 — GOALS

**Owner:** Member B  
**Scope:** Goal CRUD, progress calculation, achieved-goal history, and ownership validation.

## Implementation tasks from the project roadmap

The tasks below are extracted from the day-by-day plan. Keep the original sequence and completion conditions.

### #### Ngày 5

**B: [F7] Goals (full-stack)**
- [ ] Backend: `POST/GET/PUT/DELETE /api/goals` (steps ngày, distance ngày, calories ngày, thời gian tập tuần, số buổi tập tuần), ghi Firestore `users/{uid}/goals/{goalId}`, validate và kiểm tra quyền sở hữu.
- [ ] Mobile: màn Goals (tạo/sửa/xóa), thanh tiến độ tính từ `useTodayActivity`, màn lịch sử goal đã đạt.
- [ ] Test: CRUD, người dùng khác không sửa được goal của mình.

**Hoàn thành khi:** service GPS chạy khi khóa màn hình; goal progress thay đổi theo bước thật.

### #### Ngày 7: Tích hợp và buffer (nhẹ hơn)

**B: [F5, F6, F7]**
- [ ] Tinh chỉnh ngưỡng phân loại trên máy thật.
- [ ] Sửa lỗi tồn của Steps và Goals. Goals đếm "số buổi tập/tuần" từ `local_exercise` của A.
- [ ] `POST /api/activities/sync` bản đầu (chuẩn bị cho F8).
## Cross-feature interfaces

- Goals are consumed by Analytics (A) through `/api/goals` and `useGoals()`.
- Progress uses `useTodayActivity`.
- Weekly exercise-count goals may use Member A's `local_exercise` data.


## Definition of done

- Complete the feature's listed tasks and acceptance conditions.
- Add relevant tests.
- Test on a physical Android device where the feature uses native functionality.
- Update the shared API/native/database contract before changing an interface used by the other member.
- Merge the feature branch into `dev` and request review.
