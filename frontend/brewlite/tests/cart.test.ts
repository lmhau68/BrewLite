import { describe, expect, it } from "vitest";
import {
  cartCount,
  cartReducer,
  cartTotal,
  consumedItemsFromOrder,
  deriveBasePrice,
  normalizeLine,
  unitPriceOf,
} from "@/lib/cart";
import { formatVND } from "@/lib/format";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { TOPPINGS } from "@/lib/menu-options";
import type { CartLine } from "@/lib/types";

const coffee = MOCK_PRODUCTS[0]; // 29.000đ
const pearl = TOPPINGS[0]; // +8.000đ
const cheese = TOPPINGS[2]; // +10.000đ

describe("formatVND", () => {
  it("định dạng có dấu chấm ngăn cách", () => {
    expect(formatVND(0)).toBe("0đ");
    expect(formatVND(29000)).toBe("29.000đ");
    expect(formatVND(1250000)).toBe("1.250.000đ");
  });
});

describe("unitPriceOf", () => {
  it("cộng giá size và topping", () => {
    expect(unitPriceOf(coffee, "S", [])).toBe(29000);
    expect(unitPriceOf(coffee, "L", [])).toBe(39000);
    expect(unitPriceOf(coffee, "M", [pearl, cheese])).toBe(29000 + 6000 + 8000 + 10000);
  });
});

describe("cartReducer", () => {
  const add = (state: CartLine[], size: "S" | "M" | "L" = "S", qty = 1, toppings = [pearl]) =>
    cartReducer(state, { type: "add", product: coffee, size, toppings, qty });

  it("thêm món mới", () => {
    const s = add([]);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ productId: 1, size: "S", qty: 1, unitPrice: 37000 });
  });

  it("gộp dòng khi cùng sản phẩm/size/topping", () => {
    const s = add(add([], "S", 1), "S", 2);
    expect(s).toHaveLength(1);
    expect(s[0].qty).toBe(3);
  });

  it("tách dòng khi khác size", () => {
    expect(add(add([], "S"), "L")).toHaveLength(2);
  });

  it("tăng/giảm/xoá, giảm về 0 thì bỏ dòng", () => {
    let s = add([], "S", 1);
    const key = s[0].key;
    s = cartReducer(s, { type: "inc", key });
    expect(s[0].qty).toBe(2);
    s = cartReducer(s, { type: "dec", key });
    s = cartReducer(s, { type: "dec", key });
    expect(s).toHaveLength(0);
  });

  it("giới hạn số lượng mỗi dòng", () => {
    expect(add([], "S", 999)[0].qty).toBe(20);
  });

  it("tính tổng tiền và số lượng", () => {
    const s = add(add([], "S", 2), "M", 1, []); // 2×37.000 + 1×35.000
    expect(cartCount(s)).toBe(3);
    expect(cartTotal(s)).toBe(2 * 37000 + 35000);
    expect(cartReducer(s, { type: "clear" })).toEqual([]);
  });
});

describe("cartReducer - sửa size/topping trong giỏ", () => {
  const add = (state: CartLine[], size: "S" | "M" | "L" = "S", qty = 1, toppings = [pearl]) =>
    cartReducer(state, { type: "add", product: coffee, size, toppings, qty });

  it("đổi size thì tính lại đơn giá, giữ nguyên số lượng", () => {
    const s = add([], "S", 2);
    const updated = cartReducer(s, { type: "update", key: s[0].key, size: "L", toppings: [pearl] });
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ size: "L", qty: 2, unitPrice: 29000 + 10000 + 8000 });
  });

  it("đổi topping thì tính lại đơn giá", () => {
    const s = add([], "S", 1, [pearl]); // 37.000
    const updated = cartReducer(s, {
      type: "update",
      key: s[0].key,
      size: "S",
      toppings: [cheese], // +10.000
    });
    expect(updated[0].unitPrice).toBe(39000);
    expect(updated[0].toppings).toEqual([cheese]);
  });

  it("bỏ topping thì đơn giá về giá gốc", () => {
    const s = add([], "S", 1, [pearl]);
    const updated = cartReducer(s, { type: "update", key: s[0].key, size: "S", toppings: [] });
    expect(updated[0].unitPrice).toBe(29000);
    expect(updated[0].toppings).toEqual([]);
  });

  it("khoá dòng đổi theo size/topping mới", () => {
    const s = add([], "S", 1);
    const updated = cartReducer(s, { type: "update", key: s[0].key, size: "M", toppings: [] });
    expect(updated[0].key).not.toBe(s[0].key);
  });

  it("gộp vào dòng đã có cùng cấu hình", () => {
    const s = add(add([], "S", 1), "M", 2);
    expect(s).toHaveLength(2);
    // Sửa dòng size S thành size M (cùng topping) -> trùng dòng M đang có -> gộp lại
    const updated = cartReducer(s, { type: "update", key: s[0].key, size: "M", toppings: [pearl] });
    expect(updated).toHaveLength(1);
    expect(updated[0].size).toBe("M");
    expect(updated[0].qty).toBe(3);
  });

  it("không sửa được món không có tuỳ chọn", () => {
    const water = MOCK_PRODUCTS.find((p) => !p.customizable)!;
    const s = cartReducer([], { type: "add", product: water, size: "S", toppings: [], qty: 1 });
    const updated = cartReducer(s, { type: "update", key: s[0].key, size: "L", toppings: [] });
    expect(updated).toEqual(s);
  });

  it("bỏ qua dòng không tồn tại", () => {
    const s = add([], "S", 1);
    expect(cartReducer(s, { type: "update", key: "khong-ton-tai", size: "L", toppings: [] })).toEqual(s);
  });

  it("giữ tổng tiền khớp sau khi sửa", () => {
    const s = add([], "S", 1, [pearl]);
    const updated = cartReducer(s, { type: "update", key: s[0].key, size: "M", toppings: [pearl] });
    expect(cartTotal(updated)).toBe(updated[0].unitPrice * updated[0].qty);
  });
});

describe("giỏ hàng lưu từ trước (chưa có basePrice)", () => {  it("khôi phục được giá gốc để sửa size/topping", () => {
    const legacy: CartLine = {
      key: "1|M|pearl",
      productId: 1,
      name: "Cà phê sữa đá",
      emoji: "☕",
      size: "M",
      toppings: [pearl],
      qty: 1,
      unitPrice: 29000 + 6000 + 8000,
    };
    expect(deriveBasePrice(legacy)).toBe(29000);

    const normalized = normalizeLine(legacy);
    expect(normalized.basePrice).toBe(29000);
    expect(normalized.customizable).toBe(true);

    const updated = cartReducer([normalized], {
      type: "update",
      key: normalized.key,
      size: "L",
      toppings: [],
    });
    expect(updated[0].unitPrice).toBe(39000);
  });
});

describe("gỡ món đã thanh toán khỏi giỏ hàng", () => {
  const add = (state: CartLine[], size: "S" | "M" | "L" = "S", qty = 1, toppings = [pearl]) =>
    cartReducer(state, { type: "add", product: coffee, size, toppings, qty });

  /** Đơn mẫu: 1 ly size S + trân châu đen */
  const order = {
    items: [
      {
        productId: 1,
        name: "Cà phê sữa đá",
        emoji: "☕",
        size: "S" as const,
        toppings: [pearl],
        qty: 1,
        unitPrice: 37000,
        lineTotal: 37000,
      },
    ],
  };

  it("dựng khoá dòng từ dữ liệu đơn để khớp với giỏ hàng", () => {
    expect(consumedItemsFromOrder(order)).toEqual([{ key: "1|S|pearl", qty: 1 }]);
  });

  it("xoá hẳn dòng khi giỏ trùng hệt đơn", () => {
    const s = add([], "S", 1);
    const next = cartReducer(s, { type: "consume", items: consumedItemsFromOrder(order) });
    expect(next).toEqual([]);
    expect(cartCount(next)).toBe(0);
  });

  it("trừ đúng số lượng đã thanh toán, phần dư vẫn còn", () => {
    const s = add([], "S", 3);
    const next = cartReducer(s, { type: "consume", items: consumedItemsFromOrder(order) });
    expect(next).toHaveLength(1);
    expect(next[0].qty).toBe(2);
  });

  it("giữ nguyên món không thuộc đơn (thêm sau khi đặt đơn)", () => {
    const s = add(add([], "S", 1), "M", 1);
    const next = cartReducer(s, { type: "consume", items: consumedItemsFromOrder(order) });
    expect(next).toHaveLength(1);
    expect(next[0].size).toBe("M");
  });

  it("không làm gì khi đơn không có món nào khớp", () => {
    const s = add([], "M", 1); // size M - khác đơn (size S)
    const next = cartReducer(s, { type: "consume", items: consumedItemsFromOrder(order) });
    expect(next).toHaveLength(1);
    expect(next[0].qty).toBe(1);
  });

  it("không đổi giỏ khi không có món nào được gỡ", () => {
    const s = add([], "S", 1);
    expect(cartReducer(s, { type: "consume", items: [] })).toEqual(s);
  });
});
