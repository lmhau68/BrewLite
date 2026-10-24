# Product Backlog (khởi tạo – chuyển thành GitHub Issues/Project board)

## Sprint 1 – Nền tảng + menu

| ID | Hạng mục | Trạng thái |
|---|---|---|
| S1-01 | Thiết lập repo, branch strategy, README, .gitignore, .env.example | Done |
| S1-02 | Đưa tài liệu Task 1–3 vào `docs/` | Done (Task 1–2: chờ thành viên bổ sung) |
| S1-03 | API `GET /products`, `GET /products/:id`, `GET /health` | Done |
| S1-04 | Màn hình menu mobile-first (loading/empty/error) | Done |
| S1-05 | Dữ liệu mẫu / seed | Done |
| S1-06 | Test tối thiểu cho API và component/luồng chính | Done |
| S1-07 | CI: Install → Lint → Test → Build khi mở PR | Done |
| S1-08 | Bật branch protection cho `main`, chụp minh chứng CI pass/fail | To do (thao tác trên GitHub) |

## Sprint 2 – Hoàn thiện MVP

| ID | Hạng mục |
|---|---|
| S2-01 | Đăng ký, đăng nhập, JWT |
| S2-02 | Tạo đơn hàng (transaction + trừ tồn kho) |
| S2-03 | Thanh toán Ví/Thẻ mô phỏng + idempotency |
| S2-04 | Trạng thái và lịch sử đơn |
| S2-05 | Nối PostgreSQL: Prisma migrate + seed |
| S2-06 | Integration test (tạo đơn/thanh toán) + 1 E2E menu → xác nhận |
| S2-07 | Dockerfile, docker-compose web+api+db |
| S2-08 | CD: build image, push registry, deploy, smoke test, rollback |
