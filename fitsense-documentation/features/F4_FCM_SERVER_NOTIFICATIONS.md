# F4 — FCM SERVER NOTIFICATIONS

**Owner:** Member A  
**Scope:** Device token registration, goal notifications, weekly report, and server-side notification handling.

## Implementation tasks from the project roadmap

The tasks below are extracted from the day-by-day plan. Keep the original sequence and completion conditions.

### #### Ngày 11

**A: [F4] FCM + [F1] Xóa tài khoản**
- [ ] Đăng ký device token (`user_devices`), `NotificationService`, thông báo hoàn thành goal, **báo cáo tuần** (`@Scheduled` mỗi sáng Chủ nhật), xử lý token hết hạn.
- [ ] Màn Notification settings.
- [ ] Endpoint **xóa tài khoản**: xóa MySQL (cascade), Firestore, Firebase Auth user; màn xác nhận trong Profile.

## Definition of done

- Complete the feature's listed tasks and acceptance conditions.
- Add relevant tests.
- Test on a physical Android device where the feature uses native functionality.
- Update the shared API/native/database contract before changing an interface used by the other member.
- Merge the feature branch into `dev` and request review.
