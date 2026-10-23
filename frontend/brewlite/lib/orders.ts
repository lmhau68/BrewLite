import type {
  CartLine,
  CreateOrderItemPayload,
  CreateOrderPayload,
  Order,
  OrderStatus,
  PaymentMethod,
} from "./types";

/* ------------------------------------------------------------------ */
/* Nhãn hiển thị                                                       */
/* ------------------------------------------------------------------ */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PREPARING: "Đang pha chế",
  READY: "Sẵn sàng",
  COMPLETED: "Hoàn tất",
  PAYMENT_FAILED: "Thanh toán thất bại",
  CANCELLED: "Đã huỷ",
};

/** Nhóm màu cho badge trạng thái */
export const ORDER_STATUS_TONE: Record<OrderStatus, "amber" | "green" | "red" | "grey"> = {
  PENDING: "amber",
  PAID: "green",
  PREPARING: "green",
  READY: "green",
  COMPLETED: "green",
  PAYMENT_FAILED: "red",
  CANCELLED: "grey",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  VI_DIEN_TU: "Ví điện tử",
  THE_NGAN_HANG: "Thẻ ngân hàng",
};

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; emoji: string }[] = [
  { id: "VI_DIEN_TU", label: "Ví điện tử", emoji: "📱" },
  { id: "THE_NGAN_HANG", label: "Thẻ ngân hàng", emoji: "💳" },
];

/* ------------------------------------------------------------------ */
/* Tính toán                                                           */
/* ------------------------------------------------------------------ */

/** Tổng tiền của giỏ hàng (đã trừ theo số lượng từng dòng). */
export function orderTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

/** Chuyển dòng giỏ hàng sang payload tạo đơn. Không gửi giá lên API. */
export function buildOrderItems(lines: CartLine[]): CreateOrderItemPayload[] {
  return lines.map((l) => ({
    productId: l.productId,
    size: l.size,
    qty: l.qty,
    toppings: l.toppings.map((t) => ({ id: t.id })),
  }));
}

/** Payload đầy đủ để POST /orders. */
export function buildOrderPayload(
  lines: CartLine[],
  customer: { name: string; phone: string; address?: string; note?: string },
): CreateOrderPayload {
  return {
    customerName: customer.name.trim(),
    customerPhone: customer.phone.trim(),
    address: customer.address?.trim() || undefined,
    note: customer.note?.trim() || undefined,
    items: buildOrderItems(lines),
  };
}

/* ------------------------------------------------------------------ */
/* Kiểm tra dữ liệu nhập                                               */
/* ------------------------------------------------------------------ */

export interface CheckoutErrors {
  name?: string;
  phone?: string;
  address?: string;
}

/** Số di động Việt Nam: 10-11 chữ số, bắt đầu bằng 0. */
export const PHONE_PATTERN = /^0\d{9,10}$/;

export function validateCheckout(customer: {
  name: string;
  phone: string;
  address?: string;
}): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (!customer.name.trim()) {
    errors.name = "Vui lòng nhập tên người nhận.";
  } else if (customer.name.trim().length > 100) {
    errors.name = "Tên không được dài quá 100 ký tự.";
  }

  const phone = customer.phone.trim();
  if (!phone) {
    errors.phone = "Vui lòng nhập số điện thoại.";
  } else if (!PHONE_PATTERN.test(phone)) {
    errors.phone = "Số điện thoại chưa đúng (10-11 số, bắt đầu bằng 0).";
  }

  if ((customer.address ?? "").trim().length > 200) {
    errors.address = "Địa chỉ không được dài quá 200 ký tự.";
  }

  return errors;
}

export function hasErrors(errors: CheckoutErrors): boolean {
  return Object.keys(errors).length > 0;
}

/* ------------------------------------------------------------------ */
/* Thanh toán                                                          */
/* ------------------------------------------------------------------ */

/**
 * Khoá idempotency cho một lần thanh toán.
 * Dùng lại đúng khoá này khi thử thanh toán lại để không tạo giao dịch trùng (ADR-005).
 */
export function createIdempotencyKey(prefix = "ord"): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

/* ------------------------------------------------------------------ */
/* Hiển thị                                                            */
/* ------------------------------------------------------------------ */

/** "#12" — mã đơn hiển thị cho khách. */
export function formatOrderId(id: number): string {
  return `#${id}`;
}

/** "23/10/2026 16:35" */
export function formatOrderTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Tổng số ly trong đơn. */
export function orderItemCount(order: Order): number {
  return order.items.reduce((n, i) => n + i.qty, 0);
}

/**
 * "Nguyễn An · 0901234567" — bỏ qua phần thiếu.
 * API có thể chưa trả tên/điện thoại, khi đó không in dấu `·` thừa.
 */
export function formatCustomerLine(order: Order): string {
  const parts = [order.customer.name, order.customer.phone].map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Khách vãng lai";
}
