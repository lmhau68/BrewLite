# ADR-006: Đóng gói Docker, triển khai trên Render (đề xuất)

- **Trạng thái:** Proposed – nhóm cần xác nhận nền tảng thực tế trước Task 5

## Bối cảnh
Đề bài yêu cầu deployment diagram phản ánh đúng nền tảng thực tế, có HTTPS, DB không public, CI/CD và rollback.

## Quyết định (đề xuất)
- Image Docker cho web và api, tag theo commit SHA, đẩy lên GitHub Container Registry (GHCR).
- Chạy trên **Render** (Web Service ×2 + PostgreSQL managed, kết nối qua mạng nội bộ).
- Secret lưu ở GitHub Actions Secrets và Render Environment.
- Rollback: deploy lại image tag SHA trước đó.

## Hệ quả
Nếu nhóm chọn nền tảng khác (Railway, Fly.io, VPS…), cập nhật ADR này, `docs/deployment.md` và `docs/diagrams/deployment.puml` trong cùng một PR.
