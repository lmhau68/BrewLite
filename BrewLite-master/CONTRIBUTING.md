# Hướng dẫn đóng góp

## Chiến lược branch

- `main`: luôn chạy được, được bảo vệ – **không push trực tiếp**.
- Nhánh làm việc tách từ `main`: `feat/<mô-tả>`, `fix/<mô-tả>`, `docs/<mô-tả>`, `chore/<mô-tả>`.
  Ví dụ: `feat/menu-screen`, `docs/architecture-adr`.
- Mọi thay đổi (code, yêu cầu, sơ đồ, kiến trúc) đi qua **Pull Request** với mô tả rõ **lý do** thay đổi, ít nhất 1 người review.

Thiết lập trên GitHub (Settings → Branches → Branch protection rule cho `main`):
✅ Require a pull request before merging · ✅ Require status checks to pass (chọn `web` và `api` của workflow **CI**).
Nhờ vậy PR không thể merge khi lint, test hoặc build thất bại (Task 4.4).

## Quy ước commit (Conventional Commits)

```
<type>(<scope>): <mô tả ngắn>

feat(web): thêm bộ lọc danh mục
fix(api): trả 404 khi sản phẩm không tồn tại
docs(architecture): thêm ADR-006
test(web): thêm test giỏ hàng
chore(ci): thêm job build
```

`type`: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`. `scope`: `web`, `api`, `docs`, `ci`, `db`.

## Definition of Done

Một hạng mục hoàn thành khi:

- [ ] Đáp ứng tiêu chí chấp nhận của yêu cầu/user story tương ứng.
- [ ] Có test (unit/component hoặc integration) cho logic mới và test đang chạy xanh.
- [ ] `npm run lint`, `npm test`, `npm run build` đều thành công ở phần đã đổi.
- [ ] Có trạng thái loading/empty/error (với màn hình lấy dữ liệu) và validate đầu vào.
- [ ] Tài liệu liên quan (`docs/`, README, traceability-matrix) đã cập nhật.
- [ ] Không commit secret; `.env.example` cập nhật nếu thêm biến mới.
- [ ] PR được review và CI xanh trước khi merge.

## Product Backlog

Theo dõi bằng GitHub Issues/Projects; bản khởi tạo ở [`docs/backlog.md`](./docs/backlog.md).
