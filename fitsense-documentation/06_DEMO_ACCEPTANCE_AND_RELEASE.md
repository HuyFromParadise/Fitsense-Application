## 7. Phân công thuyết trình/demo theo feature

| Phần demo | Người trình bày | Feature |
|---|---|---|
| Đăng nhập, profile, bảo mật (403 khi truy cập dữ liệu người khác) | A | F1 |
| GPS chạy nền: khóa màn hình, route vẫn đủ | A | F2 |
| Analytics tuần/tháng, FCM | A | F3, F4 |
| Cảm biến: X/Y/Z, bước, nhãn chuyển động | B | F6 |
| Dashboard bước, qua reboot không mất | B | F5 |
| Goals và thông báo hoàn thành | B | F7, F9 |
| Offline sync: tắt mạng → ghi → bật mạng → đúng một bản | B (A hỗ trợ phần server/MySQL) | F8 |

---

## 8. Đối chiếu tiêu chí nghiệm thu

| AC | Nội dung | Feature | Chủ | Người kiểm tra | Đạt |
|---|---|---|---|---|---|
| AC-01, 02 | Đăng ký, đăng nhập, profile | F1 | A | B | ☐ |
| AC-03, 04 | Bước thực tế, ổn định sau restart | F5 | B | A | ☐ |
| AC-05 | Accelerometer, gyroscope | F6 | B | A | ☐ |
| AC-06, 07 | GPS session, lưu route | F2 | A | B | ☐ |
| AC-08 | Goals | F7 | B | A | ☐ |
| AC-09 | Lịch sử, analytics | F2, F3 | A | B | ☐ |
| AC-10, 11, 12 | Offline, sync, không trùng | F8 | B | A | ☐ |
| AC-13 | Cô lập dữ liệu người dùng | F1 + tất cả | Cả hai | Test chéo | ☐ |
| AC-14 | Từ chối quyền, sensor không có | F2, F5, F6 | Cả hai | Cả hai | ☐ |

---

## 9. Nếu trễ tiến độ, cắt theo thứ tự

1. Thông báo lỗi đồng bộ, báo cáo tuần bằng FCM (F4).
2. Ảnh đại diện (dùng avatar mặc định).
3. Analytics tháng (giữ tuần).
4. Google Sign-In.
5. Local notification nhắc ít vận động.
6. Conflict resolution nâng cao (giữ "server thắng").
7. Testcontainers (dùng H2 hoặc test mock).

**Không được cắt:** step counter + xử lý reboot, accelerometer/gyroscope, GPS foreground service, offline sync cơ bản không trùng, cô lập dữ liệu người dùng.

**Nếu một người trễ:** người kia nhận lại phần **ít phụ thuộc nhất** của feature trễ (thường là màn hình hoặc test), không nhận phần native vì cần máy thật và ngữ cảnh.

---
