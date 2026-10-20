# BrewLite – Công nghệ Phần mềm (Assignment 2)

Ứng dụng đặt đồ uống mobile-first: **Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn**.
Công nghệ: Next.js (PWA) · NestJS · PostgreSQL · Docker.

## Cấu trúc repository

| Thư mục | Nội dung | Tương ứng đề bài |
|---|---|---|
| `frontend/brewlite` | Next.js mobile-first/PWA | `apps/web` |
| `backend/brew-lite` | NestJS API | `apps/api` |
| `backend/prisma` | Schema PostgreSQL (Prisma) | – |
| `docs/` | Yêu cầu, sơ đồ, kiến trúc + ADR, truy vết | `docs/` |
| `tests/` | Integration/E2E (Task 5) | `tests/` |
| `.github/workflows` | CI (Task 4.4), CD (Task 5) | `.github/workflows` |

## Trạng thái Sprint 1

| Hạng mục | Trạng thái |
|---|---|
| `GET /products`, `GET /products/:id`, `GET /health` | ✅ |
| Màn hình menu (tìm kiếm, danh mục, chi tiết + size/topping, giỏ hàng) | ✅ |
| Trạng thái loading / empty / error | ✅ |
| Dữ liệu mẫu (frontend mock + API seed) | ✅ |
| Unit/component test, CI (Install → Lint → Test → Build) | ✅ |
| Đăng nhập, đặt đơn, thanh toán, theo dõi đơn | Sprint 2 |

## Chạy local (VS Code)

Yêu cầu: **Node.js ≥ 20** (khuyến nghị 22) và npm.

### Cách 1 – Chỉ frontend (dữ liệu giả, nhanh nhất)

```bash
cd frontend/brewlite
npm install
npm run dev          # http://localhost:3000
```

Xem thử các trạng thái: `http://localhost:3000/?state=error` và `?state=empty`.

### Cách 2 – Frontend + API thật

Terminal 1 – API:

```bash
cd backend/brew-lite
npm install
npm run start:dev    # http://localhost:4000  (thử: /health, /products, /products/1)
```

Terminal 2 – Web:

```bash
cd frontend/brewlite
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm install
npm run dev
```

### API

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/products` | Danh sách; tuỳ chọn `?category=coffee\|tea\|milk-tea\|blended&q=từ khoá` |
| GET | `/products/:id` | Chi tiết; `400` nếu id không phải số, `404` nếu không tồn tại |
| GET | `/health` | Kiểm tra sống |

### Lint, test, build

```bash
# trong frontend/brewlite hoặc backend/brew-lite
npm run lint
npm test
npm run build
# chỉ backend: npm run test:e2e
```

### Database (từ Sprint 2)

```bash
docker compose up -d db        # PostgreSQL 15 tại localhost:5432
cd backend && npm install && npx prisma db push
```

## Quy trình làm việc

Xem [`CONTRIBUTING.md`](./CONTRIBUTING.md) (branch, PR, commit, Definition of Done) và [`docs/`](./docs).
