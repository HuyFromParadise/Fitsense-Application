# BUGS

Ghi lỗi theo mẫu dưới. Người sửa thường không phải người phát hiện (trừ khi thống nhất khác).
Lỗi môi trường phát hiện khi kiểm tra chéo cuối ngày cũng ghi ở đây nếu lặp lại.

| ID | Ngày | Feature | Mô tả | Môi trường / bước tái hiện | Mức | Phát hiện | Sửa | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| BUG-001 | 2026-11-19 | F5 / Activity sync | `POST /api/activities/sync` insert bản mới không gán `id` → Hibernate ném `IdentifierGenerationException` khi lưu (INSERT thất bại). Unit test dùng repository mock nên không phát hiện. | Gọi `POST /api/activities/sync` với một ngày chưa có trong `daily_activities`; hoặc đọc `BaseEntity` (có `@Id` UUID nhưng không `@GeneratedValue`). | P0 | Dev B | `ActivityService.newEntity` gán `UUID.randomUUID()` + test assert `id != null` | Fixed |

- **P0**: chặn demo hoặc mất dữ liệu.
- **P1**: sai tính năng chính, còn cách tránh tạm thời.
- **P2**: giao diện, chính tả, hiệu năng nhỏ.
