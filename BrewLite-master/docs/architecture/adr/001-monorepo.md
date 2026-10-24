# ADR-001: Dùng một monorepo cho web, API và tài liệu

- **Trạng thái:** Accepted · **Ngày:** 2026-10-20

## Bối cảnh
Nhóm phát triển frontend, backend và tài liệu song song; đề bài yêu cầu một repository có `apps/web`, `apps/api`, `docs`.

## Quyết định
Dùng **một repository**. Repo hiện tại giữ tên thư mục `frontend/brewlite` (web) và `backend/brew-lite` (api) để không phá lịch sử và nhánh của các thành viên; chúng tương đương `apps/web` và `apps/api` trong đề bài. Có thể đổi tên bằng một PR riêng (`git mv`) nếu giảng viên yêu cầu đúng tên.

## Hệ quả
- (+) Một PR đổi được cả hai phía; CI và truy vết tập trung.
- (−) CI cần tách job theo thư mục.
