# ADR-002: Frontend dùng Next.js (App Router), mobile-first/PWA

- **Trạng thái:** Accepted

## Quyết định
Next.js + React + Tailwind CSS, thiết kế mobile-first (khung tối đa 448px), có `manifest.webmanifest` để cài như PWA. Logic nghiệp vụ phía client (giỏ hàng) viết bằng hàm thuần (`lib/cart.ts`) để dễ unit test.

## Hệ quả
- (+) Bắt buộc theo đề; UI nhanh, dễ triển khai.
- (−) Cần chú ý ranh giới Server/Client Component; service worker/offline để Sprint 2.
