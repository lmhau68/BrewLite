import { SIZES, TOPPINGS } from "./menu-options";
import type { CartLine, Order, Product, SizeId, SizeOption, ToppingOption } from "./types";

export function unitPriceFromBase(
  basePrice: number,
  size: SizeId,
  toppings: ToppingOption[],
  sizes: SizeOption[] = SIZES,
): number {
  const sizeExtra = sizes.find((s) => s.id === size)?.extra ?? 0;
  return basePrice + sizeExtra + toppings.reduce((sum, t) => sum + t.price, 0);
}

export function unitPriceOf(
  product: Product,
  size: SizeId,
  toppings: ToppingOption[],
  sizes: SizeOption[] = SIZES,
): number {
  return unitPriceFromBase(product.price, size, toppings, sizes);
}

export function lineKey(productId: number, size: SizeId, toppings: ToppingOption[]): string {
  return `${productId}|${size}|${toppings.map((t) => t.id).sort().join(",")}`;
}

/** Một món cần gỡ khỏi giỏ hàng: khoá dòng + số lượng bị dùng. */
export interface ConsumedItem {
  key: string;
  qty: number;
}

/**
 * Chuyển món của một đơn thành danh sách cần gỡ khỏi giỏ hàng.
 *
 * Khoá dòng được dựng lại từ chính dữ liệu của đơn (productId + size + topping)
 * chứ không phụ thuộc vào state trong bộ nhớ, nên vẫn khớp với giỏ hàng sau
 * khi người dùng tải lại trang.
 */
export function consumedItemsFromOrder(order: Pick<Order, "items">): ConsumedItem[] {
  return order.items.map((item) => ({
    key: lineKey(item.productId, item.size, Array.isArray(item.toppings) ? item.toppings : []),
    qty: item.qty,
  }));
}

/** Sắp xếp topping theo thứ tự trong catalog để hiển thị ổn định. */
function sortToppings(toppings: ToppingOption[]): ToppingOption[] {
  const order = new Map(TOPPINGS.map((t, i) => [t.id, i]));
  return [...toppings].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

/**
 * Khôi phục giá gốc (size S) của một dòng giỏ.
 * Dùng cho dòng lưu từ trước khi có trường `basePrice`.
 */
export function deriveBasePrice(line: CartLine, sizes: SizeOption[] = SIZES): number {
  const sizeExtra = sizes.find((s) => s.id === line.size)?.extra ?? 0;
  const toppingsTotal = line.toppings.reduce((sum, t) => sum + t.price, 0);
  return Math.max(0, line.unitPrice - sizeExtra - toppingsTotal);
}

/**
 * Bổ sung các trường còn thiếu của một dòng giỏ (giá gốc, cờ tuỳ chọn).
 * Trả về chính object cũ nếu đã đủ dữ liệu - giữ nguyên tham chiếu để
 * provider biết giỏ đã nạp xong và bắt đầu ghi xuống localStorage.
 */
export function normalizeLine(line: CartLine): CartLine {
  const toppings = Array.isArray(line.toppings) ? line.toppings : [];
  const basePrice = line.basePrice ?? deriveBasePrice({ ...line, toppings });
  const customizable = line.customizable ?? true;
  if (toppings === line.toppings && basePrice === line.basePrice && customizable === line.customizable) {
    return line;
  }
  return { ...line, toppings, basePrice, customizable };
}

/** Chuẩn hoá cả giỏ hàng (dùng khi nạp từ localStorage). */
export function normalizeLines(lines: CartLine[]): CartLine[] {
  return lines.map(normalizeLine);
}

export type CartAction =
  | {
      type: "add";
      product: Product;
      size: SizeId;
      toppings: ToppingOption[];
      qty: number;
      /** Đơn giá 1 ly tính theo size/topping từ API; bỏ trống = dùng bảng giá dự phòng */
      unitPrice?: number;
    }
  | { type: "inc"; key: string }
  | { type: "dec"; key: string }
  | { type: "remove"; key: string }
  /** Sửa size/topping của một dòng đã có trong giỏ */
  | { type: "update"; key: string; size: SizeId; toppings: ToppingOption[] }
  /** Gỡ đúng số lượng vừa thanh toán khỏi giỏ hàng */
  | { type: "consume"; items: ConsumedItem[] }
  | { type: "clear" }
  | { type: "hydrate"; lines: CartLine[] };

export const MAX_QTY_PER_LINE = 20;

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "add": {
      const key = lineKey(action.product.id, action.size, action.toppings);
      const existing = state.find((l) => l.key === key);
      if (existing) {
        return state.map((l) =>
          l.key === key ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, l.qty + action.qty) } : l,
        );
      }
      return [
        ...state,
        {
          key,
          productId: action.product.id,
          name: action.product.name,
          emoji: action.product.emoji,
          size: action.size,
          toppings: action.toppings,
          qty: Math.min(MAX_QTY_PER_LINE, action.qty),
unitPrice: action.unitPrice ?? unitPriceOf(action.product, action.size, action.toppings),
          basePrice: action.product.price,
          customizable: action.product.customizable,
        },
      ];
    }
    case "inc":
      return state.map((l) =>
        l.key === action.key ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, l.qty + 1) } : l,
      );
    case "dec":
      return state
        .map((l) => (l.key === action.key ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0);
    case "remove":
      return state.filter((l) => l.key !== action.key);
    case "update": {
      const index = state.findIndex((l) => l.key === action.key);
      if (index === -1) return state;
      const current = normalizeLine(state[index]);
      // Món không có tuỳ chọn (nước suối...) thì không cho sửa.
      if (current.customizable === false) return state;

      const basePrice = current.basePrice ?? deriveBasePrice(current);
      const toppings = sortToppings(action.toppings);
      const newKey = lineKey(current.productId, action.size, toppings);
      const unitPrice = unitPriceFromBase(basePrice, action.size, toppings);

      // Cấu hình không đổi: chỉ cập nhật lại thông tin của dòng.
      if (newKey === current.key) {
        return state.map((l, i) =>
          i === index ? { ...current, size: action.size, toppings, unitPrice, basePrice } : l,
        );
      }

      // Trùng cấu hình với một dòng đã có trong giỏ -> gộp số lượng.
      const otherIndex = state.findIndex((l) => l.key === newKey);
      if (otherIndex !== -1) {
        const other = normalizeLine(state[otherIndex]);
        const merged: CartLine = {
          ...other,
          qty: Math.min(MAX_QTY_PER_LINE, other.qty + current.qty),
        };
        return state.filter((_, i) => i !== index && i !== otherIndex).concat(merged);
      }

      return state.map((l, i) =>
        i === index
          ? { ...current, key: newKey, size: action.size, toppings, unitPrice, basePrice }
          : l,
      );
    }
    case "consume": {
      if (action.items.length === 0) return state;
      // Cộng dồn phòng khi một đơn có hai dòng trùng cấu hình.
      const used = new Map<string, number>();
      for (const item of action.items) {
        used.set(item.key, (used.get(item.key) ?? 0) + item.qty);
      }
      const next: CartLine[] = [];
      for (const line of state) {
        const consumed = used.get(line.key);
        // Dòng không thuộc đơn vừa thanh toán (món thêm sau khi đặt đơn) -> giữ nguyên.
        if (!consumed) {
          next.push(line);
          continue;
        }
        const qty = line.qty - consumed;
        if (qty > 0) next.push({ ...line, qty });
      }
      return next;
    }
    case "clear":
      return [];
    case "hydrate": {
      const normalized = action.lines.map(normalizeLine);
      // Giữ nguyên tham chiếu mảng khi dữ liệu đã chuẩn hoá: CartProvider
      // so sánh tham chiếu để biết đã nạp xong và bắt đầu ghi xuống localStorage.
      const unchanged = normalized.every((l, i) => l === action.lines[i]);
      return unchanged ? action.lines : normalized;
    }
  }
}

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
