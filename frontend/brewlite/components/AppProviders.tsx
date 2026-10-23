"use client";

import type { ReactNode } from "react";
import { CartProvider } from "./CartProvider";
import { OrdersProvider } from "./OrdersProvider";

/**
 * Gom các provider ứng dụng vào một chỗ để mọi route dùng chung
 * (giỏ hàng và danh sách đơn không bị mất khi chuyển trang).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <OrdersProvider>{children}</OrdersProvider>
    </CartProvider>
  );
}