# BrewLite – Web (Next.js 16, mobile-first PWA)

Giao diện đặt đồ uống: **Xem menu → Chọn size/topping → Giỏ hàng → Xác nhận đơn → Thanh toán → Theo dõi đơn**.

Trong giỏ hàng có nút **Sửa** để đổi lại size/topping của một món đã thêm; nếu đổi trùng với một dòng
đang có trong giỏ thì hai dòng được gộp lại. Món cố định (không có tuỳ chọn) không hiện nút Sửa.

Mỗi lần vào trang `/checkout` là một lần đặt hàng mới: Next.js 16 (cacheComponents) giữ page cũ trong DOM bằng
React `<Activity>` thay vì unmount, nên `CheckoutScreen` reset toàn bộ state (bước thanh toán, đơn cũ, thông tin
người nhận) ngay khi rời trang. Quay lại `/checkout` sẽ thấy bước nhập thông tin chứ không phải màn "đặt đơn xong"
của lần trước. Sheet tạm trên menu (chi tiết món, giỏ hàng) cũng đóng lại theo cách này.

Khi chọn cách thanh toán **Thẻ ngân hàng**, 4 ô (số thẻ, tên chủ thẻ, hạn thẻ MM/YY, CVV) là bắt buộc:
thiếu hoặc sai định dạng thì báo lỗi ngay dưới từng ô và **không gọi `POST /payments`** (kiểm tra ở
`lib/card.ts`). Dữ liệu thẻ chỉ nằm ở giao diện, không gửi lên máy chủ; nút "Điền thẻ demo" điền sẵn một thẻ
ảo hợp lệ để thử nhanh.

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
| `components/` | Màn hình và UI: `MenuScreen`, `CheckoutScreen`, `OrdersScreen`, `OrderDetailScreen`, `CartSheet`, `ProductSheet`, `ProductOptions` |
| `components/CartProvider.tsx`, `components/OrdersProvider.tsx` | State giỏ hàng và danh sách đơn (dùng chung cho mọi route) |
| `lib/api.ts` | Lớp truy cập dữ liệu: gọi API nếu có `NEXT_PUBLIC_API_URL`, ngược lại dùng mock |
| `lib/orders.ts` | Logic nghiệp vụ đơn hàng: tính tiền, validate, khoá idempotency, nhãn hiển thị |
| `lib/card.ts` | Thông tin thẻ ngân hàng (ảo): định dạng khi gõ + validate 4 trường bắt buộc (số thẻ, tên chủ thẻ, hạn thẻ, CVV) |
| `lib/cart.ts`, `lib/menu-options.ts`, `lib/format.ts` | Giỏ hàng (reducer thuần), size/topping, định dạng VND |
| `lib/use-reset-on-hide.ts` | Hook reset state của client component khi page bị ẩn (Next.js giữ page cũ bằng React `<Activity>`) |
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
