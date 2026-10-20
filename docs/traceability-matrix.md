# Ma trận truy vết

> Các mã FR/NFR/Use-case sẽ khớp với SRS của Task 1. Bảng dưới là phần đã có ở Sprint 1.

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 (xem menu) | US-01 Xem menu | architecture.md §4 | `GET /products`, `components/MenuScreen.tsx` | `products.service.spec.ts`, `products.e2e-spec.ts`, `tests/MenuScreen.test.tsx` |
| FR-02 (chi tiết sản phẩm) | US-02 Xem chi tiết | architecture.md §4 | `GET /products/:id`, `components/ProductSheet.tsx` | `products.e2e-spec.ts` |
| FR-03 (giỏ hàng) | US-03 Quản lý giỏ | architecture.md §4.1 | `lib/cart.ts`, `components/CartSheet.tsx` | `tests/cart.test.ts` |
| NFR (khả dụng) | – | ADR-002 | Menu mobile-first, trạng thái loading/empty/error | `tests/MenuScreen.test.tsx` |
