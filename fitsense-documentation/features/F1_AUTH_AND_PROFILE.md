# F1 — AUTH + PROFILE

**Owner:** Member A  
**Scope:** Firebase authentication, user profile, security rules, and account deletion.

## Implementation tasks from the project roadmap

The tasks below are extracted from the day-by-day plan. Keep the original sequence and completion conditions.

### #### Ngày 2

**A: [F1] Auth (phần 1, full-stack)**
- [ ] Backend: hoàn thiện filter xác thực (verify chữ ký, audience, hết hạn), `GET /api/users/me` tự tạo user lần đầu theo `firebase_uid`.
- [ ] Mobile: màn Register, Login, Logout bằng email/password, lưu trạng thái đăng nhập, Axios interceptor lấy ID token mới nhất, auth guard, xử lý 401.
- [ ] Test: token đúng/sai/hết hạn, `ping-auth`.

### #### Ngày 3

**A: [F1] Auth (phần 2)**
- [ ] Google Sign-In, Reset password, validate form (Zod).
- [ ] Màn Profile: chỉnh họ tên, ngày sinh, chiều cao, cân nặng, giới tính (tùy chọn), mức fitness, tính BMI.

### #### Ngày 4

**A: [F1] Profile (phần 2, full-stack)**
- [ ] Backend: `PUT /api/users/me` (validate chiều cao, cân nặng, ngày sinh), ghi Firestore `users/{uid}/profile/main` và `preferences/settings` bằng Admin SDK.
- [ ] Firestore Security Rules: chỉ đọc tài liệu của mình, client không ghi.
- [ ] Mobile: đọc profile bằng Firestore snapshot, ảnh đại diện (hoặc avatar mặc định), hook `useProfile()` cho B dùng.
- [ ] Test Rules: client ghi bị từ chối, đọc tài liệu người khác bị từ chối.

### #### Ngày 11

**A: [F4] FCM + [F1] Xóa tài khoản**
- [ ] Đăng ký device token (`user_devices`), `NotificationService`, thông báo hoàn thành goal, **báo cáo tuần** (`@Scheduled` mỗi sáng Chủ nhật), xử lý token hết hạn.
- [ ] Màn Notification settings.
- [ ] Endpoint **xóa tài khoản**: xóa MySQL (cascade), Firestore, Firebase Auth user; màn xác nhận trong Profile.
## Cross-feature interfaces

- Profile is consumed by Member B for stride and calorie calculations.
- The mobile profile hook is `useProfile()`.
- The authenticated token is shared by all API calls through the Axios client.
- `SecurityConfig` is owned by Member A.


## Definition of done

- Complete the feature's listed tasks and acceptance conditions.
- Add relevant tests.
- Test on a physical Android device where the feature uses native functionality.
- Update the shared API/native/database contract before changing an interface used by the other member.
- Merge the feature branch into `dev` and request review.
