# Cấu trúc Kiến trúc Hệ thống - Dự án BrewLite

Dự án BrewLite được thiết kế theo kiến trúc **Monorepo** (lưu trữ toàn bộ mã nguồn trong một repository duy nhất), áp dụng mô hình phân tán Client-Server. Hệ thống được chia thành 3 node mạng độc lập và được đóng gói, định tuyến tự động thông qua **Docker Compose**.

Dưới đây là sơ đồ không gian lưu trữ mã nguồn và chức năng của từng thành phần lõi:

## 📂 Sơ đồ Cây Thư Mục (Directory Tree)

```text
BrewLite/
├── docker-compose.yml      # Cấu hình mạng lưới lõi, NAT port và định tuyến cho các container
├── README.md               # Tài liệu "mặt tiền" hướng dẫn triển khai dự án
├── doc/                    # Thư mục lưu trữ tài liệu Kỹ nghệ phần mềm
│   ├── user-stories.md     # Đặc tả yêu cầu Agile (User Stories & Acceptance Criteria)
│   └── project-structure.md# Cấu trúc dự án (File hiện tại)
│
├── frontend/               # Vùng hoạt động của Client (Next.js - Port 3000)
│   └── brewlite/
│       ├── app/            # Định tuyến giao diện (Routing) theo kiến trúc App Router
│       ├── components/     # Các module UI tái sử dụng (AccountButton, CartProvider...)
│       ├── lib/            # Logic gọi API, định nghĩa Type và xử lý giỏ hàng (Zustand/Context)
│       ├── tests/          # Các kịch bản kiểm thử tự động (Unit Test cho UI)
│       ├── public/         # Tài nguyên tĩnh (Hình ảnh, Icon)
│       ├── Dockerfile      # Bản thiết kế đóng gói container cho Frontend
│       └── package.json    # Quản lý thư viện Client-side
│
└── backend/                # Vùng hoạt động của Server (NestJS - Port 4000)
    └── brew-lite/
        ├── prisma/         # Lớp giao tiếp Cơ sở dữ liệu (ORM)
        │   ├── schema.prisma # Lược đồ định nghĩa cấu trúc các bảng (Product, Order, User...)
        │   └── seed.ts       # Script tự động bơm dữ liệu mẫu (Menu cà phê) vào DB
        ├── src/
        │   ├── auth/       # Module Xác thực (Băm mật khẩu, cấp phát JWT)
        │   ├── orders/     # Module Quản lý Đơn hàng (Cỗ máy trạng thái, Tính điểm thưởng)
        │   ├── payments/   # Module Thanh toán (Mô phỏng cổng thanh toán, xử lý Idempotency)
        │   ├── products/   # Module Quản lý Thực đơn (Lấy danh sách đồ uống, tuỳ chọn)
        │   ├── app.module.ts # Trạm trung chuyển (Root Module) kết nối toàn bộ hệ thống
        │   └── main.ts     # Điểm khởi động Server, thiết lập CORS và ValidationPipe
        ├── test/           # Các kịch bản kiểm thử tích hợp (e2e) và Unit Test nghiệp vụ
        ├── Dockerfile      # Bản thiết kế đóng gói container cho Backend
        └── package.json    # Quản lý thư viện Server-side