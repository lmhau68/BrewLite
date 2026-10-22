import { IsInt, IsNotEmpty, IsString, IsNumber, IsIn, IsOptional, IsBoolean } from 'class-validator';

export class CreatePaymentDto {
  @IsInt({ message: 'orderId phải là số nguyên' })
  @IsNotEmpty({ message: 'orderId không được để trống' })
  orderId!: number;

  @IsString({ message: 'idempotencyKey phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'idempotencyKey không được để trống (chống thanh toán trùng lặp)' })
  idempotencyKey!: string;

  @IsNumber({}, { message: 'amount phải là số tiền hợp lệ' })
  @IsNotEmpty({ message: 'amount không được để trống' })
  amount!: number;

  @IsString({ message: 'method phải là chuỗi' })
  @IsIn(['VI_DIEN_TU', 'THE_NGAN_HANG'], {
    message: 'Phương thức thanh toán phải là VI_DIEN_TU hoặc THE_NGAN_HANG',
  })
  method!: string;

  /**
   * Cờ giả lập (mặc định true). Truyền false để kiểm thử luồng thanh toán thất bại (PAYMENT_FAILED).
   */
  @IsOptional()
  @IsBoolean({ message: 'mockSuccess phải là boolean (true/false)' })
  mockSuccess?: boolean;
}

