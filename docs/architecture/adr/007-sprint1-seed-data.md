# ADR-007: Sprint 1 dùng dữ liệu mẫu thay vì nối database

- **Trạng thái:** Accepted (tạm thời, hết hiệu lực khi hoàn thành Task 5)

## Quyết định
- API trả sản phẩm từ seed in-memory (`products.seed.ts`).
- Frontend mặc định dùng `lib/mock-data.ts` khi chưa có `NEXT_PUBLIC_API_URL`; đặt biến này để gọi API thật.
- Hai nguồn dữ liệu mẫu có cùng cấu trúc `Product`.

## Hệ quả
- (+) Mỗi người chạy được ngay không cần Docker/DB; MVP kiểm chứng được luồng xem menu.
- (−) Có hai bản seed phải giữ đồng bộ đến khi chuyển sang Prisma seed. Prisma `Product` cần bổ sung `category`, `description`, `emoji`, `customizable` khi nối DB.
