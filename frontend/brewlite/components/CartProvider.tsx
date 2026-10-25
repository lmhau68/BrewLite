"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { cartCount, cartReducer, cartTotal, normalizeLines, type CartAction } from "@/lib/cart";
import type { CartLine } from "@/lib/types";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  total: number;
  dispatch: (action: CartAction) => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "brewlite.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const hydrated = useRef(false);
  /** Giỏ vừa nạp từ localStorage - chờ state áp dụng xong mới được ghi lại */
  const pendingHydrate = useRef<CartLine[] | null>(null);
  /** Chỉ ghi xuống localStorage sau khi đã nạp xong, tránh ghi đè dữ liệu cũ */
  const canPersist = useRef(false);

  // Nạp giỏ hàng từ localStorage sau khi mount (tránh lệch hydration)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Chuẩn hoá ngay khi nạp: dòng giỏ lưu từ trước chưa có `basePrice`
        // thì bổ sung giá gốc để sửa được size/topping.
        const parsed = normalizeLines(JSON.parse(raw) as CartLine[]);
        pendingHydrate.current = parsed;
        dispatch({ type: "hydrate", lines: parsed });
        return;
      }
    } catch {
      /* dữ liệu hỏng -> bỏ qua */
    }
    canPersist.current = true;
  }, []);

  // State đã khớp với dữ liệu vừa nạp -> cho phép ghi xuống localStorage
  useEffect(() => {
    if (pendingHydrate.current && lines === pendingHydrate.current) {
      pendingHydrate.current = null;
      canPersist.current = true;
    }
  }, [lines]);

  // Lưu giỏ hàng
  useEffect(() => {
    if (!canPersist.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* private mode / đầy bộ nhớ -> bỏ qua */
    }
  }, [lines]);

  const value = useMemo(
    () => ({ lines, count: cartCount(lines), total: cartTotal(lines), dispatch }),
    [lines],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart phải được dùng bên trong <CartProvider>");
  return ctx;
}