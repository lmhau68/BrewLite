import { describe, expect, it } from "vitest";
import { cartCount, cartReducer, cartTotal, unitPriceOf } from "@/lib/cart";
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
