# F9 — LOCAL NOTIFICATIONS + POWER

**Owner:** Member B  
**Scope:** Scheduled local reminders, workout completion notifications, and battery optimization.

## Implementation tasks from the project roadmap

The tasks below are extracted from the day-by-day plan. Keep the original sequence and completion conditions.

### #### Ngày 11

**B: [F9] Local notification + tối ưu pin**
- [ ] WorkManager + NotificationManager: nhắc đạt bước hằng ngày, nhắc ít vận động (trong khung giờ cho phép), thông báo hoàn thành bài tập.
- [ ] Tối ưu pin: interval GPS thích ứng (2-5 giây khi chạy, dài hơn khi đứng yên), `PRIORITY_BALANCED` khi phù hợp, hủy sensor khi không cần.
- [ ] Đo mức pin hao trong 30 phút tracking.

**Hoàn thành khi:** nhận được FCM trên máy thật; thông báo local đúng giờ; xóa tài khoản xóa sạch dữ liệu.

## Definition of done

- Complete the feature's listed tasks and acceptance conditions.
- Add relevant tests.
- Test on a physical Android device where the feature uses native functionality.
- Update the shared API/native/database contract before changing an interface used by the other member.
- Merge the feature branch into `dev` and request review.
