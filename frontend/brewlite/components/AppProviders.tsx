"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { CartProvider } from "./CartProvider";
import { OrdersProvider } from "./OrdersProvider";

/**
 * Gom các provider ứng dụng vào một chỗ để mọi route dùng chung
 * (đăng nhập, giỏ hàng và danh sách đơn không bị mất khi chuyển trang).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <OrdersProvider>{children}</OrdersProvider>
      </CartProvider>
    </AuthProvider>
  );
}