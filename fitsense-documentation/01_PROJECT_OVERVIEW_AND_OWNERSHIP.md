## 1. Vì sao chia theo feature

| Chia theo tầng (cũ) | Chia theo feature (mới) |
|---|---|
| A chờ B xong native mới làm được màn hình | Mỗi người tự làm từ DB đến màn hình, ít phải chờ nhau |
| Tích hợp dồn vào cuối tuần | Mỗi feature chạy được end-to-end ngay khi xong |
| Hai người cùng sửa một tầng, dễ conflict | Mỗi feature nằm trong thư mục riêng, ít đụng file nhau |
| Một người chỉ hiểu một nửa hệ thống | Mỗi người hiểu trọn vẹn feature của mình, dễ bảo vệ khi demo |

**Điều kiện để chia theo feature chạy được:** bộ khung ngày 1 phải đủ tốt để hai người không phải sửa chung các **file nóng** (xem mục 4).

---

## 2. Phân chia feature

| # | Feature | Module đặc tả | Người | Nặng ở |
|---|---|---|---|---|
| F1 | Auth + Profile (kèm xóa tài khoản) | Module 1 | **A** | Backend + Firebase |
| F2 | GPS Exercise (foreground service, tracking, lịch sử, chi tiết route) | Module 4 | **A** | Native + Backend |
| F3 | Analytics (tuần/tháng, biểu đồ) | Module 6 | **A** | Backend + UI |
| F4 | Push notification FCM + báo cáo tuần | Module 8 (phần server) | **A** | Backend |
| F5 | Steps + Dashboard (baseline, reboot, daily summary) | Module 2 | **B** | Native |
| F6 | Sensor Monitor (accelerometer, gyroscope, phân loại chuyển động) | Module 3 | **B** | Native |
| F7 | Goals (CRUD, tiến độ, lịch sử đạt) | Module 5 | **B** | Backend + UI |
| F8 | Offline Sync (queue, retry, reconcile, conflict) | Module 7 | **B** | Cả hai tầng |
| F9 | Local notification + tối ưu pin | Module 8 (phần máy) | **B** | Native |

**Lý do chia như vậy:**

- A giữ phần có nhiều endpoint và dữ liệu (Auth, Exercise, Analytics, FCM) cùng một feature native nặng là GPS.
- B giữ phần cảm biến native (Steps, Sensors, notification) cùng hai feature có logic khó là Goals và Sync.
- Mỗi người đều có **ít nhất một feature native** và **ít nhất một feature nhiều backend**, nên cả hai đều thực hành được toàn bộ stack.
- F8 (Sync) chạm vào dữ liệu của F2 và F5. Giải quyết bằng thiết kế **SyncHandler cắm vào** (mục 5): mỗi feature tự viết handler đồng bộ cho dữ liệu của mình, B chỉ làm lõi.

### Mẫu một feature trọn vẹn (thứ tự làm cho mọi feature)

1. **Contract:** cập nhật OpenAPI / `.d.ts` / bảng Room nếu cần (báo người kia).
2. **DB:** migration MySQL (Flyway) hoặc Firestore rules, entity Room.
3. **Backend:** repository → service → controller → DTO → validate → test.
4. **Native (nếu có):** module Kotlin + event + xử lý quyền và lifecycle.
5. **Mobile:** API client → hook → store → màn hình.
6. **Tích hợp:** chạy trên máy thật, kiểm tra các edge case.
7. **Xong khi:** đạt "Hoàn thành khi" của ngày đó, có test, đã merge vào `dev`.

---
