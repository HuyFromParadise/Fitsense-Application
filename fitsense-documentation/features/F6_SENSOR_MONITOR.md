# F6 — SENSOR MONITOR

**Owner:** Member B  
**Scope:** Accelerometer, gyroscope, movement classification, and sensor monitor UI.

## Implementation tasks from the project roadmap

The tasks below are extracted from the day-by-day plan. Keep the original sequence and completion conditions.

### #### Ngày 6

**B: [F6] Sensors (full-stack native + UI)**
- [ ] `MotionSensorModule`: accelerometer + gyroscope, `SENSOR_DELAY_UI`, hủy listener khi ra nền, throttle event ~10-20 Hz.
- [ ] Màn Sensor Monitor: X/Y/Z real-time, số bước, nhãn chuyển động, biểu đồ nhỏ.
- [ ] Phân loại theo ngưỡng trên cửa sổ trượt ~2 giây (độ lệch chuẩn của độ lớn gia tốc), ngưỡng nằm trong file cấu hình.
- [ ] (Tùy chọn) Bảng `sensor_samples` để ghi mẫu phục vụ chỉnh ngưỡng.

**Hoàn thành khi:** A chạy trọn một buổi tập và lưu lên server được, gọi trùng UUID không tạo bản thứ hai; B thấy nhãn đổi đúng khi đứng yên/đi/chạy.

## Definition of done

- Complete the feature's listed tasks and acceptance conditions.
- Add relevant tests.
- Test on a physical Android device where the feature uses native functionality.
- Update the shared API/native/database contract before changing an interface used by the other member.
- Merge the feature branch into `dev` and request review.
