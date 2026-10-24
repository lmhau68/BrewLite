# Ma trận truy vết

> Các mã FR/NFR/Use-case sẽ khớp với SRS của Task 1. Bảng dưới đây là phần đã có từ Sprint 1.

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 (xem menu) | US-01 Xem menu | architecture.md §4 | `GET /products`, `components/MenuScreen.tsx` | `frontend/brewlite/tests/MenuScreen.test.tsx` |
| FR-02 (chi tiết sản phẩm) | US-02 Xem chi tiết | architecture.md §4 | `GET /products/:id`, `components/ProductSheet.tsx` | `frontend/brewlite/tests/MenuScreen.test.tsx` |
| FR-03 (giỏ hàng) | US-03 Quản lý giỏ | architecture.md §4.1 | `lib/cart.ts`, `components/CartSheet.tsx` | `frontend/brewlite/tests/cart.test.ts` |
| FR-04 (xác nhận đơn) | US-04 Đặt đơn | architecture.md §4.1 | `POST /orders`, `components/CheckoutScreen.tsx`, `lib/orders.ts` | `frontend/brewlite/tests/CheckoutScreen.test.tsx`, `frontend/brewlite/tests/orders.test.ts` |
| FR-05 (thanh toán) | US-05 Thanh toán | ADR-005 | `POST /payments`, `lib/api.ts` (`payOrder`), `components/CheckoutScreen.tsx` | `frontend/brewlite/tests/CheckoutScreen.test.tsx` |
| FR-06 (theo dõi đơn) | US-06 Xem lịch sử / chi tiết đơn | architecture.md §4.1 | `GET /orders`, `GET /orders/:id`, `components/OrdersScreen.tsx`, `components/OrderDetailScreen.tsx` | `frontend/brewlite/tests/OrdersScreen.test.tsx` |
| NFR (khả dụng) | – | ADR-002 | Menu mobile-first, trạng thái loading/empty/error | `frontend/brewlite/tests/MenuScreen.test.tsx` |
| NFR (dữ liệu) | – | ADR-004, ADR-005 | Server tự tính giá, trừ tồn kho trong transaction, idempotency key cho thanh toán | Phía backend: `backend/brew-lite/test/app.e2e-spec.ts`; phía UI: `frontend/brewlite/tests/orders.test.ts` |

> Ghi chú: phần frontend của FR-04 → FR-06 (màn hình xác nhận đơn và theo dõi đơn) đã hoàn thành, chạy được với dữ liệu giả. API tạo đơn/thanh toán và integration/E2E cho luồng này thuộc phần backend và Task 5.
