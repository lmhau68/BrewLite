# BrewLite – Web (Next.js 16, mobile-first PWA)

Giao diện đặt đồ uống: **Xem menu → Chọn size/topping → Giỏ hàng → Xác nhận đơn → Thanh toán → Theo dõi đơn**.

## Chạy local

```bash
npm install
npm run dev      # http://localhost:3000
```

Mặc định dùng **dữ liệu giả** (đơn lưu trong `localStorage`) nên không cần backend.

### Dùng API thật (NestJS + PostgreSQL)

```bash
cd ../../backend/brew-lite
npm install
npm run start:dev          # http://localhost:4000
```

```bash
cd frontend/brewlite
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

Các endpoint giao diện dùng: `GET /products`, `GET /products/:id`, `POST /orders`, `GET /orders`, `GET /orders/:id`, `POST /payments`.

## Route

| Route | Nội dung |
|---|---|
| `/` | Menu: tìm kiếm, danh mục, chi tiết món (size/topping), giỏ hàng |
| `/checkout` | Xác nhận đơn: thông tin người nhận → chọn cách thanh toán → kết quả |
| `/orders` | Lịch sử đơn hàng (loading / empty / error, nút làm mới) |
| `/orders/[id]` | Chi tiết đơn: món, tổng tiền, trạng thái, thanh toán lại nếu đơn chưa thành công |

## Cấu trúc mã nguồn

| Thư mục | Nội dung |
|---|---|
| `app/` | Route của Next.js (App Router) |
| `components/` | Màn hình và UI: `MenuScreen`, `CheckoutScreen`, `OrdersScreen`, `OrderDetailScreen`, `CartSheet`, `ProductSheet` |
| `components/CartProvider.tsx`, `components/OrdersProvider.tsx` | State giỏ hàng và danh sách đơn (dùng chung cho mọi route) |
| `lib/api.ts` | Lớp truy cập dữ liệu: gọi API nếu có `NEXT_PUBLIC_API_URL`, ngược lại dùng mock |
| `lib/orders.ts` | Logic nghiệp vụ đơn hàng: tính tiền, validate, khoá idempotency, nhãn hiển thị |
| `lib/cart.ts`, `lib/menu-options.ts`, `lib/format.ts` | Giỏ hàng (reducer thuần), size/topping, định dạng VND |
| `tests/` | Test Vitest + Testing Library |

## Kiểm thử

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

Demo trạng thái lỗi/rỗng của menu (chỉ khi dùng dữ liệu giả):
`http://localhost:3000/?state=error` và `?state=empty`.
