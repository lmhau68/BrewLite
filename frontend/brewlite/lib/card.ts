/**
 * Thông tin thẻ ngân hàng (ảo) ở màn thanh toán.
 *
 * Backend chỉ nhận `method` + `amount` (xem `lib/api.ts`), nên dữ liệu thẻ chỉ
 * tồn tại trong giao diện và không được gửi lên API. Tuy vậy các ô này là bắt
 * buộc trong luồng thanh toán: người dùng chọn "Thẻ ngân hàng" thì phải nhập đủ
 * thông tin thẻ mới được gọi `POST /payments`.
 */

export interface CardDetails {
  number: string;
  holder: string;
  /** Định dạng MM/YY */
  expiry: string;
  cvv: string;
}

export interface CardErrors {
  number?: string;
  holder?: string;
  expiry?: string;
  cvv?: string;
}

export const EMPTY_CARD: CardDetails = { number: "", holder: "", expiry: "", cvv: "" };

/** Thẻ ảo dùng để demo (số theo chuẩn test của cổng thanh toán). */
export const DEMO_CARD: CardDetails = {
  number: "4242 4242 4242 4242",
  holder: "NGUYEN VAN A",
  expiry: "12/28",
  cvv: "123",
};

/* ------------------------------------------------------------------ */
/* Định dạng khi gõ                                                  */
/* ------------------------------------------------------------------ */

/** Chuẩn hoá số thẻ về dạng 4 nhóm số để hiển thị. */
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return (digits.match(/.{1,4}/g) ?? []).join(" ");
}

/** Chuẩn hoá hạn thẻ về dạng MM/YY. */
export function formatCardExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** CVV chỉ gồm chữ số, tối đa 4 ký tự (mã 3 số là phổ biến nhất). */
export function formatCardCvv(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Kiểm tra dữ liệu thẻ                                              */
/* ------------------------------------------------------------------ */

/** Kiểm tra checksum Luhn: bắt lỗi gõ số thẻ sai. */
export function passesLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Kiểm tra hạn thẻ MM/YY.
 * Trả về thông báo lỗi, hoặc `undefined` nếu hợp lệ.
 */
export function validateExpiry(value: string, now: Date = new Date()): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Vui lòng nhập hạn thẻ.";

  const match = /^(\d{2})\/(\d{2})$/.exec(trimmed);
  if (!match) return "Hạn thẻ phải có dạng MM/YY.";

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return "Tháng của hạn thẻ không hợp lệ.";

  // Thẻ hết hạn khi qua hết tháng ghi trên thẻ (đầu tháng kế tiếp là hết hạn).
  const expiresAt = new Date(year, month, 1);
  if (now.getTime() >= expiresAt.getTime()) return "Thẻ đã hết hạn.";

  return undefined;
}

/** Kiểm tra đủ 4 trường thẻ. Trả về lỗi theo từng ô (rỗng = hợp lệ). */
export function validateCard(details: CardDetails, now: Date = new Date()): CardErrors {
  const errors: CardErrors = {};

  const digits = details.number.replace(/\D/g, "");
  if (!digits) {
    errors.number = "Vui lòng nhập số thẻ.";
  } else if (digits.length < 13 || digits.length > 19) {
    errors.number = "Số thẻ phải có 13-19 chữ số.";
  } else if (!passesLuhn(digits)) {
    errors.number = "Số thẻ không hợp lệ, hãy kiểm tra lại.";
  }

  const holder = details.holder.trim();
  if (!holder) {
    errors.holder = "Vui lòng nhập tên chủ thẻ.";
  } else if (holder.length < 2) {
    errors.holder = "Tên chủ thẻ quá ngắn.";
  }

  const expiryError = validateExpiry(details.expiry, now);
  if (expiryError) errors.expiry = expiryError;

  const cvv = details.cvv.trim();
  if (!cvv) {
    errors.cvv = "Vui lòng nhập CVV.";
  } else if (!/^\d{3,4}$/.test(cvv)) {
    errors.cvv = "CVV phải gồm 3-4 chữ số.";
  }

  return errors;
}

export function hasCardErrors(errors: CardErrors): boolean {
  // Ô đã sửa được gán `undefined` nên phải bỏ qua, chỉ tính lỗi thật.
  return Object.values(errors).some((message) => Boolean(message));
}
