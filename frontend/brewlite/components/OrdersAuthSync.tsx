"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useAuth } from "./AuthProvider";
import { useOrders } from "./OrdersProvider";

/**
 * Nạp lại lịch sử đơn khi người dùng đăng nhập/đăng xuất,
 * để danh sách luôn đúng với tài khoản hiện tại.
 */
export function OrdersAuthSync() {
  const { user } = useAuth();
  const { refresh } = useOrders();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const previous = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!hydrated) return;
    const id = user?.id ?? null;
    if (previous.current === undefined) {
      previous.current = id; // lần đầu: OrdersProvider đã tự nạp rồi
      return;
    }
    if (id !== previous.current) {
      previous.current = id;
      void refresh();
    }
  }, [hydrated, user, refresh]);

  return null;
}
