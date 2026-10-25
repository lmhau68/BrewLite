export type CategoryId = "coffee" | "tea" | "milk-tea" | "blended";

export interface Product {
  id: number;
  name: string;
  description: string;
  category: CategoryId;
  /** Giá cơ bản (size S), đơn vị VND */
  price: number;
  emoji: string;
  /** Tồn kho. 0 = hết hàng */
  stock: number;
  /** Cho phép chọn size/topping */
  customizable: boolean;
  bestSeller?: boolean;
  imageUrl?: string;
}

export type SizeId = "S" | "M" | "L";

export interface SizeOption {
  id: SizeId;
  label: string;
  extra: number;
}

export interface ToppingOption {
  id: string;
  name: string;
  price: number;
}

/** Danh sách size/topping do API trả về (GET /options). */
export interface MenuOptions {
  sizes: SizeOption[];
  toppings: ToppingOption[];
}

/* ------------------------------------------------------------------ */
/* Xác thực                                                            */
/* ------------------------------------------------------------------ */

export interface AuthSession {
  accessToken: string;
  userId: number;
  email: string;
}

export interface CartLine {
  /** Khoá gộp dòng: cùng sản phẩm + size + topping thì cộng dồn số lượng */
  key: string;
  productId: number;
  name: string;
  emoji: string;
  size: SizeId;
  toppings: ToppingOption[];
  qty: number;
  /** Đơn giá 1 ly đã gồm size + topping */
  unitPrice: number;
  /** Giá gốc (size S) của sản phẩm - dùng để tính lại đơn giá khi sửa size/topping */
  basePrice?: number;
  /** Sản phẩm có tuỳ chọn size/topping không (món cố định thì không sửa được) */
  customizable?: boolean;
}

/* ------------------------------------------------------------------ */
/* Đơn hàng                                                            */
/* ------------------------------------------------------------------ */

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "PAYMENT_FAILED"
  | "CANCELLED";

export type PaymentMethod = "VI_DIEN_TU" | "THE_NGAN_HANG";

export interface OrderCustomer {
  name: string;
  phone: string;
  /** Rỗng = khách nhận tại quầy */
  address?: string;
  note?: string;
}

export interface OrderLine {
  id?: number;
  productId: number;
  name: string;
  emoji: string;
  size: SizeId;
  toppings: ToppingOption[];
  qty: number;
  /** Đơn giá 1 ly (đã gồm size + topping) */
  unitPrice: number;
  /** Thành tiền của dòng = unitPrice × qty */
  lineTotal: number;
}

export interface OrderPayment {
  method: PaymentMethod;
  amount: number;
  idempotencyKey: string;
  status?: string;
  failureReason?: string;
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  /** ISO string */
  createdAt: string;
  customer: OrderCustomer;
  items: OrderLine[];
  payment?: OrderPayment | null;
  discountCode?: string | null;
  discountAmount?: number;
  loyaltyPointsAwarded?: number;
}

/** Payload gửi lên API khi tạo đơn. Không gửi giá: API tự tính từ CSDL. */
export interface CreateOrderItemPayload {
  productId: number;
  size: SizeId;
  qty: number;
  toppings: { id: string }[];
}

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  address?: string;
  note?: string;
  items: CreateOrderItemPayload[];
  /** Mã khuyến mãi (nếu có) */
  promotionCode?: string;
}
