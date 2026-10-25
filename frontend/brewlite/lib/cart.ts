import { SIZES } from "./menu-options";
import type { CartLine, Product, SizeId, SizeOption, ToppingOption } from "./types";

export function unitPriceOf(
  product: Product,
  size: SizeId,
  toppings: ToppingOption[],
  sizes: SizeOption[] = SIZES,
): number {
  const sizeExtra = sizes.find((s) => s.id === size)?.extra ?? 0;
  return product.price + sizeExtra + toppings.reduce((sum, t) => sum + t.price, 0);
}

export function lineKey(productId: number, size: SizeId, toppings: ToppingOption[]): string {
  return `${productId}|${size}|${toppings.map((t) => t.id).sort().join(",")}`;
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
    case "clear":
      return [];
    case "hydrate":
      return action.lines;
  }
}

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
