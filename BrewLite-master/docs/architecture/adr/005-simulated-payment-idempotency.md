# ADR-005: Thanh toán mô phỏng với idempotency key

- **Trạng thái:** Accepted

## Quyết định
Thanh toán Ví/Thẻ được mô phỏng bởi module `payments` trong API. Client gửi `idempotencyKey` duy nhất cho mỗi lần thanh toán; gửi lại cùng key trả về kết quả cũ, không tạo giao dịch thứ hai (`Payment.idempotencyKey` là `@unique`). Có thể cấu hình nhánh thất bại để kiểm thử `PAYMENT_FAILED`.

## Hệ quả
- (+) Không phụ thuộc bên thứ ba, kiểm thử được cả nhánh thành công/thất bại.
- (−) Không chứng minh được tích hợp cổng thanh toán thật.
