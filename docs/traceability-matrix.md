# Ma trận truy vết

> Các mã FR/NFR/Use-case sẽ khớp với SRS của Task 1. Bảng dưới đây là phần đã có từ Sprint 1.

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 (xem menu) | US-01 Xem menu | architecture.md §4 | `GET /products`, `components/MenuScreen.tsx` | `frontend/brewlite/tests/MenuScreen.test.tsx` |
| FR-02 (chi tiết sản phẩm) | US-02 Xem chi tiết | architecture.md §4 | `GET /products/:id`, `components/ProductSheet.tsx` | `frontend/brewlite/tests/MenuScreen.test.tsx` |
| FR-03 (giỏ hàng) | US-03 Quản lý giỏ | architecture.md §4.1 | `lib/cart.ts`, `components/CartSheet.tsx`, `components/ProductOptions.tsx` (thêm/sửa size + topping) | `frontend/brewlite/tests/cart.test.ts`, `frontend/brewlite/tests/CartSheet.test.tsx` |
| FR-04 (xác nhận đơn) | US-04 Đặt đơn | architecture.md §4.1 | `POST /orders`, `components/CheckoutScreen.tsx`, `lib/orders.ts`, `lib/use-reset-on-hide.ts` (reset state khi rời trang) | `frontend/brewlite/tests/CheckoutScreen.test.tsx`, `frontend/brewlite/tests/orders.test.ts` |
| FR-05 (thanh toán) | US-05 Thanh toán | ADR-005 | `POST /payments`, `lib/api.ts` (`payOrder`), `components/CheckoutScreen.tsx`, `lib/card.ts` (validate 4 trường thẻ bắt buộc) | `frontend/brewlite/tests/CheckoutScreen.test.tsx`, `frontend/brewlite/tests/card.test.ts` |
| FR-06 (theo dõi đơn) | US-06 Xem lịch sử / chi tiết đơn | architecture.md §4.1 | `GET /orders`, `GET /orders/:id`, `components/OrdersScreen.tsx`, `components/OrderDetailScreen.tsx` | `frontend/brewlite/tests/OrdersScreen.test.tsx` |
| FR-07 (điểm tích lũy) | US-07 Tích điểm khi thanh toán | ADR-005 | `POST /payments` trả `loyaltyPointsAwarded`, `components/CheckoutScreen.tsx`, `components/OrderDetailScreen.tsx` | `frontend/brewlite/tests/CheckoutScreen.test.tsx`, `backend/brew-lite/src/payments/payments.service.spec.ts` |
| NFR (khả dụng) | – | ADR-002 | Menu mobile-first, trạng thái loading/empty/error | `frontend/brewlite/tests/MenuScreen.test.tsx` |
| NFR (dữ liệu) | – | ADR-004, ADR-005 | Server tự tính giá, trừ tồn kho trong transaction, idempotency key cho thanh toán | Phía backend: `backend/brew-lite/test/app.e2e-spec.ts`; phía UI: `frontend/brewlite/tests/orders.test.ts` |

> Ghi chú: phần frontend của FR-04 → FR-06 (màn hình xác nhận đơn và theo dõi đơn) đã hoàn thành, chạy được với dữ liệu giả. API tạo đơn/thanh toán và integration/E2E cho luồng này thuộc phần backend và Task 5.
>
> **Đồng bộ hợp đồng API (frontend ↔ backend):** bảng giá size/topping và thông tin người nhận nằm ở phía server
> (`backend/brew-lite/src/products/catalog.ts`) để giá hiển thị trên giao diện luôn bằng giá API tính ra; client chỉ gửi
> `id` của topping. Điểm tích lũy và mã khuyến mãi được phản ánh hai chiều trên màn "Đặt đơn xong" và chi tiết đơn.
