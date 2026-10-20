# ADR-004: PostgreSQL + Prisma, migration bằng Prisma Migrate

- **Trạng thái:** Accepted

## Quyết định
PostgreSQL 15 là CSDL chính (bắt buộc theo đề). Schema nằm ở `backend/prisma/schema.prisma`. Dùng `prisma migrate` và seed để tái tạo DB; production chạy `prisma migrate deploy` trước khi bật API phiên bản mới.

Sprint 1 chưa nối DB: API dùng seed in-memory để MVP chạy được ngay (xem ADR-007).

## Hệ quả
- (+) Transaction cho tạo đơn + trừ tồn kho; schema có kiểu.
- (−) Thay đổi schema phải đi qua PR và migration, tránh xung đột giữa các thành viên.
