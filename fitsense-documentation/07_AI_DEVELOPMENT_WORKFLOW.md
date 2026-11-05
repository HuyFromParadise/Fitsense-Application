## 10. Cách dùng AI cho từng feature

1. Dán **đúng phần đặc tả** của feature và **giao ước liên quan** (OpenAPI, `.d.ts`, schema Room) vào prompt, tránh AI tự bịa tên hàm, tên cột.
2. Yêu cầu AI đi theo **mẫu feature trọn vẹn** (mục 2): DB → backend → native → mobile, mỗi bước kèm test.
3. Chạy trên máy thật, dán nguyên log lỗi lại cho AI.
4. Review thủ công trước khi merge. Chỗ AI hay sai: `foregroundServiceType` và quyền Android 13/14, code bridge RN kiểu cũ, nhầm "steps since boot" với "steps today", lẫn UTC với giờ địa phương, Firestore Rules quá rộng, thiếu kiểm tra `user_id` ở query.
5. Việc AI không làm thay: đi bộ/chạy lấy dữ liệu thật, đo pin, cấu hình Firebase/Google Cloud, chọn ngưỡng nhận diện chuyển động.

> Calories, pace, quãng đường và phân loại chuyển động là **ước tính**. Ghi rõ trong app và tài liệu, không trình bày như số đo y tế.
