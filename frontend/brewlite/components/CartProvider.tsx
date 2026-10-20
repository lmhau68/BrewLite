"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { cartCount, cartReducer, cartTotal, type CartAction } from "@/lib/cart";
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

  // Lưu giỏ hàng (khai báo trước effect nạp để lần chạy đầu bị bỏ qua, không ghi đè dữ liệu cũ)
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* private mode / đầy bộ nhớ -> bỏ qua */
    }
  }, [lines]);

  // Nạp giỏ hàng từ localStorage sau khi mount (tránh lệch hydration)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", lines: JSON.parse(raw) as CartLine[] });
    } catch {
      /* dữ liệu hỏng -> bỏ qua */
    }
    hydrated.current = true;
  }, []);

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
