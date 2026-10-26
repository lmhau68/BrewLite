# ☕ BrewLite - Hệ thống Đặt Cà phê Không tiền mặt

BrewLite là một ứng dụng đặt đồ uống trực tuyến tối giản (Minimum Viable Product - MVP) được xây dựng theo quy trình phát triển **Agile Scrum**. Hệ thống giúp khách hàng duyệt thực đơn, tùy chỉnh đồ uống, quản lý giỏ hàng và thanh toán không tiền mặt một cách nhanh chóng.

Dự án này là bài tập lớn môn **Công nghệ Phần mềm**, thể hiện việc áp dụng các nguyên lý thiết kế phần mềm, quản lý vòng đời dự án (SDLC) và tự động hóa triển khai (DevOps).

---

## 🏗️ Kiến trúc Hệ thống (Architecture)

Hệ thống được thiết kế theo mô hình phân tán Client-Server, lưu trữ theo kiến trúc Monorepo và được ảo hóa toàn bộ bằng Docker.

*   **Frontend:** Next.js (React, TypeScript), Tailwind CSS, Zustand (Quản lý trạng thái giỏ hàng). Chạy trên cổng `3000`.
*   **Backend:** NestJS (TypeScript), RESTful API, Class-validator, Passport (JWT Auth). Chạy trên cổng `4000`.
*   **Database:** PostgreSQL giao tiếp thông qua Prisma ORM. Chạy ngầm trên cổng `5432`.
*   **DevOps:** Docker & Docker Compose để quản lý cấu hình và triển khai tự động.

---

## ✨ Các tính năng cốt lõi (Features)

*   **Duyệt Thực Đơn & Tùy Chỉnh:** Xem danh sách đồ uống, chọn kích cỡ (S/M/L) và thêm Topping. Giá tiền được cập nhật theo thời gian thực.
*   **Quản Lý Giỏ Hàng:** Lưu trữ cục bộ trạng thái đơn hàng. Tự động dọn dẹp bộ đệm đối với khách vãng lai sau khi thanh toán để bảo vệ dữ liệu riêng tư.
*   **Xác Thực & Phân Quyền (JWT):** Đăng ký, đăng nhập an toàn với mật khẩu được băm (bcrypt).
*   **Mô Phỏng Thanh Toán (Idempotency):** Cổng thanh toán giả lập với cơ chế chống thanh toán trùng lặp (Idempotent Key).
*   **Máy Trạng Thái Đơn Hàng (Order State Machine):** Quản lý vòng đời đơn hàng chặt chẽ (`PENDING` -> `PAID` / `PAYMENT_FAILED`).
*   **Hệ Thống Tích Điểm (Loyalty):** Tự động cấp phát điểm thưởng cho khách hàng có tài khoản sau khi giao dịch thành công.

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy (Getting Started)

Dự án đã được tích hợp Kế hoạch Quản lý Cấu hình tự động. Bạn **không cần** cài đặt Node.js hay cấu hình cơ sở dữ liệu thủ công. 

### 1. Yêu cầu hệ thống (Prerequisites)
*   Đã cài đặt và đang bật **[Docker Desktop](https://www.docker.com/products/docker-desktop)**.
*   Đã cài đặt **Git**.

### 2. Triển khai hệ thống (Deployment)
Mở Terminal/Command Prompt, clone dự án về và chạy đúng 1 lệnh duy nhất:

```bash
# 1. Clone mã nguồn
git clone https://github.com/your-username/BrewLite.git
cd BrewLite

# 2. Kích hoạt toàn bộ hệ thống (Frontend, Backend, Database)
docker-compose up --build -d
```

*(Lưu ý: Trong lần chạy đầu tiên, hệ thống sẽ tự động đồng bộ cấu trúc bảng (Migration) và nạp dữ liệu menu cà phê mẫu (Seeding) vào cơ sở dữ liệu).*

### 3. Truy cập Ứng dụng
Sau khi lệnh chạy hoàn tất và các container báo `Started`, hãy mở trình duyệt và truy cập:

*   🌐 **Giao diện Khách hàng (Frontend):** [http://localhost:3000](http://localhost:3000)
*   ⚙️ **API Gateway (Backend):** [http://localhost:4000](http://localhost:4000)

### 4. Tạm dừng Hệ thống
Để dừng các container mà không xóa dữ liệu cơ sở dữ liệu, hãy gõ:
```bash
docker-compose stop
```
Để gỡ bỏ toàn bộ mạng ảo và container:
```bash
docker-compose down
```

---

## 👥 Về Đội ngũ Phát triển

Dự án được xây dựng và phát triển thông qua 3 Sprints theo khung làm việc Scrum, tập trung vào việc chuyển giao liên tục các giá trị cốt lõi cho người dùng (Incremental Delivery).