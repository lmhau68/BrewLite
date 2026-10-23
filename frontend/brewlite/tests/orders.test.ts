import { describe, expect, it } from "vitest";
import {
  buildOrderPayload,
  createIdempotencyKey,
  formatCustomerLine,
  formatOrderId,
  formatOrderTime,
  hasErrors,
  orderItemCount,
  orderTotal,
  validateCheckout,
} from "@/lib/orders";
import type { CartLine, Order } from "@/lib/types";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  key: "1|S|",
  productId: 1,
  name: "Cà phê sữa đá",
  emoji: "☕",
  size: "S",
  toppings: [],
  qty: 1,
  unitPrice: 29000,
  ...over,
});

describe("orderTotal", () => {
  it("cộng tổng của các dòng theo số lượng", () => {
    const lines = [
      line({ key: "a", unitPrice: 29000, qty: 2 }),
      line({ key: "b", unitPrice: 35000, qty: 1 }),
    ];
    expect(orderTotal(lines)).toBe(93000);
  });

  it("trả về 0 cho giỏ trống", () => {
    expect(orderTotal([])).toBe(0);
  });
});

describe("buildOrderPayload", () => {
  it("chuyển dòng giỏ sang payload và không gửi giá", () => {
    const payload = buildOrderPayload(
      [line({ key: "a", qty: 2, toppings: [{ id: "pearl", name: "Trân châu đen", price: 8000 }] })],
      { name: "  Nguyễn Văn A ", phone: " 0901234567 ", address: " 1 Nguyễn Huệ ", note: " ít đá " },
    );

    expect(payload.customerName).toBe("Nguyễn Văn A");
    expect(payload.customerPhone).toBe("0901234567");
    expect(payload.address).toBe("1 Nguyễn Huệ");
    expect(payload.note).toBe("ít đá");
    expect(payload.items).toEqual([
      { productId: 1, size: "S", qty: 2, toppings: [{ id: "pearl" }] },
    ]);
    expect(payload.items[0]).not.toHaveProperty("unitPrice");
  });

  it("bỏ trống địa chỉ/ghi chú khi khách nhận tại quầy", () => {
    const payload = buildOrderPayload([line()], { name: "A", phone: "0901234567", address: "   " });
    expect(payload.address).toBeUndefined();
    expect(payload.note).toBeUndefined();
  });
});

describe("validateCheckout", () => {
  it("báo lỗi khi thiếu tên và số điện thoại", () => {
    const errors = validateCheckout({ name: "  ", phone: "" });
    expect(errors.name).toBeTruthy();
    expect(errors.phone).toBeTruthy();
    expect(hasErrors(errors)).toBe(true);
  });

  it("báo lỗi khi số điện thoại sai định dạng", () => {
    expect(validateCheckout({ name: "A", phone: "12345" }).phone).toBeTruthy();
    expect(validateCheckout({ name: "A", phone: "09012345678" }).phone).toBeUndefined();
  });

  it("báo lỗi khi địa chỉ quá dài", () => {
    expect(validateCheckout({ name: "A", phone: "0901234567", address: "x".repeat(201) }).address).toBeTruthy();
  });

  it("chấp nhận thông tin hợp lệ", () => {
    const errors = validateCheckout({ name: "Nguyễn Văn A", phone: "0901234567" });
    expect(hasErrors(errors)).toBe(false);
  });
});

describe("createIdempotencyKey", () => {
  it("tạo khoá khác nhau và giữ tiền tố", () => {
    const a = createIdempotencyKey("ord1");
    const b = createIdempotencyKey("ord1");
    expect(a.startsWith("ord1_")).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("hiển thị đơn", () => {
  it("định dạng mã đơn và thời gian", () => {
    expect(formatOrderId(12)).toBe("#12");
    // Dựng theo giờ máy để không phụ thuộc múi giờ
    const d = new Date(2026, 9, 23, 14, 5);
    expect(formatOrderTime(d.toISOString())).toBe("23/10/2026 14:05");
  });

  it("đếm tổng số ly trong đơn", () => {
    const order: Order = {
      id: 1,
      status: "PENDING",
      total: 60000,
      createdAt: "2026-10-23T02:35:00.000Z",
      customer: { name: "A", phone: "0901234567" },
      items: [
        { productId: 1, name: "A", emoji: "☕", size: "S", toppings: [], qty: 2, unitPrice: 29000, lineTotal: 58000 },
        { productId: 2, name: "B", emoji: "🧋", size: "M", toppings: [], qty: 1, unitPrice: 2000, lineTotal: 2000 },
      ],
    };
    expect(orderItemCount(order)).toBe(3);
  });
});

describe("formatCustomerLine", () => {
  const base: Order = {
    id: 1,
    status: "PENDING",
    total: 0,
    createdAt: "2026-10-23T02:35:00.000Z",
    customer: { name: "Nguyễn An", phone: "0901234567" },
    items: [],
  };

  it("ghép tên và số điện thoại", () => {
    expect(formatCustomerLine(base)).toBe("Nguyễn An · 0901234567");
  });

  it("bỏ qua số điện thoại rỗng, không để lại dấu phân cách", () => {
    expect(formatCustomerLine({ ...base, customer: { name: "Nguyễn An", phone: "" } })).toBe(
      "Nguyễn An",
    );
  });

  it("hiển thị nhãn mặc định khi API không trả thông tin khách", () => {
    expect(
      formatCustomerLine({ ...base, customer: { name: "", phone: "" } }),
    ).toBe("Khách vãng lai");
  });
});