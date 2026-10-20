# ADR-003: Backend NestJS dạng modular monolith

- **Trạng thái:** Accepted

## Quyết định
Một ứng dụng NestJS, chia module theo domain (`products`, `auth`, `orders`, `payments`, `health`). Controller → Service → Data access.

## Phương án đã loại
Microservices: quá phức tạp so với phạm vi và thời gian của MVP.

## Hệ quả
- (+) Đơn giản, dễ test và deploy một container.
- (−) Scale theo từng module bị hạn chế.
