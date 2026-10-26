# Danh sách User Story - Dự án BrewLite MVP

## US-01: Duyệt Thực Đơn (Menu)
**Là một** khách hàng,
**Tôi muốn** xem danh sách các loại đồ uống kèm hình ảnh và giá cả,
**Để** tôi có thể dễ dàng quyết định mình muốn uống gì.

* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Hệ thống hiển thị lưới danh sách đồ uống gồm: Tên, Hình ảnh, Giá cơ bản.
  * Giao diện phải có trạng thái loading khi đang chờ API và empty state nếu không có dữ liệu.
  * Thời gian phản hồi (Response time) của API danh sách sản phẩm phải dưới 500ms.

## US-02: Tùy Chỉnh Đồ Uống (Customization)
**Là một** khách hàng,
**Tôi muốn** bấm vào một món nước để chọn kích cỡ (Size) và thêm topping,
**Để** tôi có một ly nước đúng với sở thích cá nhân.

* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Người dùng có thể chọn các Size (S, M, L) và Topping (Trân châu, Kem...).
  * Hệ thống phải tự động tính toán và cập nhật lại giá tiền ngay lập tức dựa trên các tùy chọn.

## US-03: Quản Lý Giỏ Hàng (Cart Management)
**Là một** khách hàng,
**Tôi muốn** thêm món vào giỏ, thay đổi số lượng hoặc xóa món,
**Để** tôi có thể kiểm tra lại tổng tiền trước khi quyết định thanh toán.

* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Thêm, sửa, xóa sản phẩm mượt mà và lưu trữ trạng thái giỏ hàng ở bộ nhớ tạm (Context/Zustand).
  * Hệ thống tự động tính tổng tiền của tất cả các món.
  * Hiển thị huy hiệu (badge) thông báo tổng số lượng món đang có trong giỏ hàng.
  * Nếu người dùng Đăng xuất, giỏ hàng phải tự động được dọn sạch (clear) để bảo mật.

## US-04: Xác Thực Người Dùng (Authentication)
**Là một** khách hàng thường xuyên,
**Tôi muốn** đăng ký và đăng nhập vào hệ thống,
**Để** tôi có thể tích lũy điểm thưởng và theo dõi lịch sử mua hàng của mình.

* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Người dùng có thể đăng ký tài khoản mới và đăng nhập.
  * Hệ thống phải băm (hash) mật khẩu bằng bcrypt trước khi lưu vào cơ sở dữ liệu để bảo mật.
  * Cấp phát token định danh JWT (JSON Web Token) sau khi đăng nhập thành công và dùng guard bảo vệ các route nhạy cảm.

## US-05: Thanh Toán Không Tiền Mặt (Cashless Checkout)
**Là một** khách hàng,
**Tôi muốn** thanh toán đơn hàng bằng ví điện tử hoặc thẻ ngân hàng,
**Để** tôi không cần phải mang theo tiền mặt khi mua nước.

* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Nút "Thanh toán" chỉ hiển thị khi có ít nhất 1 sản phẩm trong giỏ.
  * Khi xác nhận, đơn hàng được tạo ở trạng thái `PENDING`.
  * Nếu thanh toán thành công, đơn hàng chuyển sang `PAID`. Nếu lỗi cổng thanh toán, chuyển sang `PAYMENT_FAILED` và giữ nguyên giỏ hàng.
  * **Bảo mật:** Với khách vãng lai (không đăng nhập), hệ thống phải xóa toàn bộ dữ liệu đơn hàng lưu cục bộ (Local Storage) ngay sau khi thanh toán thành công để tránh rò rỉ dữ liệu riêng tư.

## US-06: Khuyến Mãi và Lịch Sử Đơn Hàng (Loyalty & History)
**Là một** khách hàng đã đăng nhập,
**Tôi muốn** xem lại lịch sử các đơn hàng và điểm tích lũy,
**Để** tôi biết mình đã tiêu dùng bao nhiêu và sắp được nhận ưu đãi gì.

* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Hệ thống cấp phát điểm thưởng (loyalty points) cho khách hàng có định danh ngay sau khi đơn hàng chuyển trạng thái `PAID`.
  * Cung cấp màn hình hiển thị danh sách lịch sử đơn hàng (gọi từ endpoint `GET /orders/me`).